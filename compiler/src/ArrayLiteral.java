import java.util.List;

class ArrayLiteral extends ASTNode {
    List<ASTNode> elements;

    ArrayLiteral(List<ASTNode> elements) {
        this.elements = elements;
    }
}
