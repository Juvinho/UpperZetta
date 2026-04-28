import javax.swing.*;
import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class UZSDialog extends JDialog {
    private JPasswordField passwordField;
    private JLabel statusLabel;
    private JButton unlockButton;
    private byte[] uzsData;
    private byte[] result;
    private boolean cancelled = true;

    public UZSDialog(Frame parent, byte[] uzsData) {
        super(parent, "🔒 Arquivo Selado", true);
        this.uzsData = uzsData;
        initUI();
    }

    private void initUI() {
        setLayout(new BorderLayout(10, 10));
        setSize(400, 250);
        setLocationRelativeTo(null);

        JPanel mainPanel = new JPanel(new GridLayout(0, 1, 5, 5));
        mainPanel.setBorder(BorderFactory.createEmptyBorder(10, 20, 10, 20));

        // Metadata extraction
        String pkg = "N/A";
        String date = "N/A";
        try {
            ByteBuffer buffer = ByteBuffer.wrap(uzsData);
            buffer.position(44);
            ByteArrayOutputStream metadataBytes = new ByteArrayOutputStream();
            byte b;
            while ((b = buffer.get()) != 0x00) {
                metadataBytes.write(b);
            }
            String json = metadataBytes.toString(StandardCharsets.UTF_8.name());
            // Simple parsing (avoiding external JSON libs)
            pkg = extractJsonValue(json, "package");
            date = extractJsonValue(json, "sealed_at");
        } catch (Exception e) {
            // Silently fail metadata
        }

        mainPanel.add(new JLabel("Pacote: " + pkg));
        mainPanel.add(new JLabel("Selado em: " + date));
        mainPanel.add(new JLabel("Senha:"));

        JPanel passPanel = new JPanel(new BorderLayout());
        passwordField = new JPasswordField();
        passPanel.add(passwordField, BorderLayout.CENTER);

        JToggleButton showPass = new JToggleButton("👁");
        showPass.addActionListener(e -> {
            if (showPass.isSelected()) {
                passwordField.setEchoChar((char) 0);
            } else {
                passwordField.setEchoChar('•');
            }
        });
        passPanel.add(showPass, BorderLayout.EAST);
        mainPanel.add(passPanel);

        statusLabel = new JLabel(" ");
        statusLabel.setForeground(Color.RED);
        mainPanel.add(statusLabel);

        add(mainPanel, BorderLayout.CENTER);

        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        JButton cancelButton = new JButton("Cancelar");
        cancelButton.addActionListener(e -> dispose());
        
        unlockButton = new JButton("Desbloquear");
        unlockButton.addActionListener(e -> onUnlock());
        
        buttonPanel.add(cancelButton);
        buttonPanel.add(unlockButton);
        add(buttonPanel, BorderLayout.SOUTH);
    }

    private String extractJsonValue(String json, String key) {
        String search = "\"" + key + "\":";
        int start = json.indexOf(search);
        if (start == -1) return "N/A";
        start = json.indexOf("\"", start + search.length()) + 1;
        int end = json.indexOf("\"", start);
        return json.substring(start, end);
    }

    private void onUnlock() {
        char[] password = passwordField.getPassword();
        if (password.length == 0) return;

        unlockButton.setEnabled(false);
        statusLabel.setText("Desbloqueando...");
        statusLabel.setForeground(Color.BLUE);

        // Run PBKDF2 in background
        new Thread(() -> {
            try {
                UZSUnsealEngine engine = new UZSUnsealEngine();
                result = engine.unseal(uzsData, password);
                cancelled = false;
                SwingUtilities.invokeLater(this::dispose);
            } catch (UZSWrongPasswordException e) {
                SwingUtilities.invokeLater(() -> {
                    statusLabel.setText(e.getMessage());
                    statusLabel.setForeground(Color.RED);
                    unlockButton.setEnabled(true);
                    Arrays.fill(password, '\0');
                });
            } catch (Exception e) {
                SwingUtilities.invokeLater(() -> {
                    statusLabel.setText("Erro inesperado.");
                    unlockButton.setEnabled(true);
                });
            }
        }).start();
    }

    public byte[] getResult() {
        return cancelled ? null : result;
    }
}
