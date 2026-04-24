public class UZSWrongPasswordException extends Exception {
    public UZSWrongPasswordException() {
        super("Senha incorreta ou arquivo inválido.");
    }
}
