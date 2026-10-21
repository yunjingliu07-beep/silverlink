package sg.silverlink.demo;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.speech.RecognizerIntent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

@CapacitorPlugin(name = "DemoDevice")
public class DemoDevicePlugin extends Plugin {
    private boolean saving = false;
    private boolean listening = false;

    @PluginMethod
    public void saveFile(PluginCall call) {
        String content = call.getString("content");
        String filename = call.getString("filename", "silverlink-export.json");
        String mime = call.getString("mimeType", "application/json");
        if (content == null || content.length() > 2_000_000) {
            call.reject("Invalid export.", "INVALID_EXPORT");
            return;
        }
        if (!mime.equals("application/json") && !mime.equals("text/html") && !mime.equals("text/plain")) {
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
