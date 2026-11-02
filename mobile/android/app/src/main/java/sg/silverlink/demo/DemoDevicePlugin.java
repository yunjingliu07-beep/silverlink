package sg.silverlink.demo;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "DemoDevice")
public class DemoDevicePlugin extends Plugin {
    private boolean saving = false;
    private boolean listening = false;
    private TextToSpeech speech;
    private boolean speechReady = false;
    private boolean speechFailed = false;
    private final ArrayList<PluginCall> voiceRequests = new ArrayList<>();
    private PluginCall speaking;
    private String utteranceId;

    @Override
    public void load() {
        getActivity().runOnUiThread(() -> {
            speech = new TextToSpeech(getContext(), status -> getActivity().runOnUiThread(() -> {
                speechReady = status == TextToSpeech.SUCCESS;
                speechFailed = !speechReady;
                if (speechReady) {
                    speech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override public void onStart(String id) {}
                        @Override public void onDone(String id) { finishSpeech(id, false); }
                        @Override public void onError(String id) { finishSpeech(id, true); }
                        @Override public void onStop(String id, boolean interrupted) { finishSpeech(id, false); }
                    });
                }
                for (PluginCall request : voiceRequests) resolveVoices(request);
                voiceRequests.clear();
            }));
        });
    }

    @PluginMethod
    public void getVoices(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (speechReady || speechFailed) resolveVoices(call);
            else voiceRequests.add(call);
        });
    }

    private void resolveVoices(PluginCall call) {
        JSArray voices = new JSArray();
        Set<Voice> available = speechReady ? speech.getVoices() : null;
        if (available != null) {
            for (Voice voice : available) {
                // Do not advertise voices that need a network or an extra download.
                if (voice.isNetworkConnectionRequired() ||
                    (voice.getFeatures() != null && voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED))) continue;
                JSObject value = new JSObject();
                value.put("name", voice.getName());
                value.put("lang", voice.getLocale().toLanguageTag());
                value.put("localService", true);
                voices.put(value);
            }
        }
        JSObject result = new JSObject();
        result.put("voices", voices);
        call.resolve(result);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            String text = call.getString("text", "");
            if (!speechReady || text.isEmpty() || text.length() > TextToSpeech.getMaxSpeechInputLength()) {
                call.reject("Speech is unavailable.", "UNAVAILABLE");
                return;
            }
            stopSpeech();
            int language = speech.setLanguage(Locale.forLanguageTag(call.getString("language", "en-SG")));
            if (language < TextToSpeech.LANG_AVAILABLE) {
                call.reject("This language is not installed.", "UNAVAILABLE");
                return;
            }
            String name = call.getString("voiceName", "");
            Set<Voice> voices = speech.getVoices();
            if (voices != null) for (Voice voice : voices) {
                if (voice.getName().equals(name)) { speech.setVoice(voice); break; }
            }
            double rate = call.getDouble("rate", 0.85);
            speech.setSpeechRate((float)Math.max(0.5, Math.min(2, rate)));
            speaking = call;
            utteranceId = call.getCallbackId();
            if (speech.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId) == TextToSpeech.ERROR) {
                finishSpeech(utteranceId, true);
            }
        });
    }

    private void finishSpeech(String id, boolean failed) {
        getActivity().runOnUiThread(() -> {
            if (speaking == null || !id.equals(utteranceId)) return;
            PluginCall call = speaking;
            speaking = null;
            utteranceId = null;
            if (failed) call.reject("Could not read aloud.", "UNAVAILABLE");
            else call.resolve();
        });
    }

    private void stopSpeech() {
        PluginCall call = speaking;
        speaking = null;
        utteranceId = null;
        if (speech != null) speech.stop();
        if (call != null) call.resolve();
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        getActivity().runOnUiThread(() -> { stopSpeech(); call.resolve(); });
    }

    @Override
    protected void handleOnPause() {
        stopSpeech();
    }

    @Override
    protected void handleOnDestroy() {
        stopSpeech();
        for (PluginCall call : voiceRequests) call.reject("App closed.", "CANCELLED");
        voiceRequests.clear();
        if (speech != null) speech.shutdown();
    }

    @PluginMethod
    public void saveFile(PluginCall call) {
        String content = call.getString("content");
        String filename = call.getString("filename", "silverlink-export.json");
        String mime = call.getString("mimeType", "application/json");
        if (content == null || content.length() > 2_000_000) {
            call.reject("Invalid export.", "INVALID_EXPORT");
            return;
        }
        if (!mime.equals("application/json") && !mime.equals("text/html") && !mime.equals("text/plain") && !mime.equals("text/csv")) {
            call.reject("Unsupported file type.", "INVALID_EXPORT");
            return;
        }
        if (saving) {
            call.reject("Another save is in progress.", "BUSY");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mime);
        intent.putExtra(Intent.EXTRA_TITLE, filename.replaceAll("[/\\\\\\p{Cntrl}]", "_"));
        saving = true;
        try {
            startActivityForResult(call, intent, "fileSelected");
        } catch (ActivityNotFoundException error) {
            saving = false;
            call.reject("No document picker is available.", "UNAVAILABLE");
        }
    }

    @ActivityCallback
    private void fileSelected(PluginCall call, ActivityResult result) {
        saving = false;
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            call.reject("Save cancelled.", "CANCELLED");
            return;
        }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(data.getData(), "wt")) {
            if (output == null) throw new IllegalStateException("No output stream.");
            output.write(call.getString("content", "").getBytes(StandardCharsets.UTF_8));
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not save the file.", "SAVE_FAILED");
        }
    }

    @PluginMethod
    public void recognizeSpeech(PluginCall call) {
        if (listening) {
            call.reject("Speech recognition is already running.", "BUSY");
            return;
        }
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("language", "zh-CN"));
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        listening = true;
        try {
            startActivityForResult(call, intent, "speechFinished");
        } catch (ActivityNotFoundException error) {
            listening = false;
            call.reject("No speech provider is installed. Use text entry.", "UNAVAILABLE");
        }
    }

    @ActivityCallback
    private void speechFinished(PluginCall call, ActivityResult result) {
        listening = false;
        if (call == null) return;
        Intent data = result.getData();
        ArrayList<String> matches = data == null ? null : data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (result.getResultCode() != Activity.RESULT_OK || matches == null || matches.isEmpty()) {
            call.reject("Speech recognition cancelled.", "CANCELLED");
            return;
        }
        JSObject response = new JSObject();
        response.put("text", matches.get(0));
        call.resolve(response);
    }

    @PluginMethod
    public void openDialer(PluginCall call) {
        String number = call.getString("number", "").replaceAll("\\s", "");
        if (!number.matches("[+0-9*#]{1,25}")) {
            call.reject("Invalid phone number.", "INVALID_NUMBER");
            return;
        }
        try {
            getActivity().startActivity(new Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", number, null)));
            call.resolve();
        } catch (ActivityNotFoundException error) {
            call.reject("No dialer is installed.", "UNAVAILABLE");
        }
    }
}
