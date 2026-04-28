public class UZSWrongPasswordException extends Exception {
    public UZSWrongPasswordException() {
        super("Algo nao esta certo.\nDica: algumas coisas nao sao pra ser abertas.");
    }
}
