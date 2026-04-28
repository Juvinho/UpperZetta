class ArrayAccessExpr extends ASTNode {
    ASTNode array;
    ASTNode index;

    ArrayAccessExpr(ASTNode array, ASTNode index) {
        this.array = array;
        this.index = index;
    }
}
