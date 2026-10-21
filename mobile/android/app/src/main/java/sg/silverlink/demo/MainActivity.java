package sg.silverlink.demo;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DemoDevicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
