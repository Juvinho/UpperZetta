import re
import sys

# ===============================
# 1. LEXER
# ===============================
TOKEN_TYPES = [
    ('KW_PACKAGE', r'\bpackage\b'),
    ('KW_IN', r'\bin\b'),
    ('KW_LET', r'\blet\b'),
    ('KW_CONST', r'\be\.const\b'),
    ('KW_FUN', r'\bfun\b'),
    ('KW_RETURN', r'\breturn\b'),
    ('KW_CLASS', r'\bclass\.public\b'),
    ('KW_COMP', r'\bcomponente\b'),
    ('KW_IF', r'\bif\b'),
    ('KW_ELSE', r'\belse\b'),
    ('KW_WHILE', r'\bwhile\b'),
    ('KW_FOR', r'\bfor\b'),
    ('KW_PRINT', r'\bSystem\.print\b'),
    ('KW_TRUE', r'\btrue\b'),
    ('KW_FALSE', r'\bfalse\b'),
    ('KW_NEW', r'\bnew\b'),
    ('ARROW', r'>>'),
    ('OP_LOG', r'&&|\|\|'),
    ('OP_REL', r'==|!=|<=|>=|<|>'),
    ('OP_ARITH', r'[\+\-\*/]'),
    ('ASSIGN', r'='),
    ('IDENT', r'[a-zA-Z_]\w*'),
    ('STRING', r'"[^"]*"'),
    ('NUMBER', r'\d+'),
    ('DOT', r'\.'),
    ('PUNCT', r'[{}();,]'),
    ('WHITESPACE', r'\s+'),
]

class Token:
    def __init__(self, type_, val, line, col):
        self.type = type_
        self.val = val
        self.line = line
        self.col = col
    def __repr__(self):
        return f"Token({self.type}, {self.val})"

class Lexer:
    def __init__(self, code):
        self.code = code
        self.tokens = []
        self.tokenize()
        
    def tokenize(self):
        regex = '|'.join(f'(?P<{name}>{pattern})' for name, pattern in TOKEN_TYPES)
        line = 1
        col = 1
        for match in re.finditer(regex, self.code):
            type_ = match.lastgroup
            val = match.group()
            if type_ != 'WHITESPACE':
                self.tokens.append(Token(type_, val, line, col))
            if '\n' in val:
                line += val.count('\n')
                col = len(val) - val.rfind('\n')
            else:
                col += len(val)

# ===============================
# 2. AST NODES
# ===============================
class Node: pass
class PackageStmt(Node):
    def __init__(self, name): self.name = name
class VarDecl(Node):
    def __init__(self, name, type_name, init_expr): self.name = name; self.type_name = type_name; self.init_expr = init_expr
class ConstDecl(Node):
    def __init__(self, name, type_name, init_expr): self.name = name; self.type_name = type_name; self.init_expr = init_expr
class FunDecl(Node):
    def __init__(self, name, params, ret_type, body): self.name = name; self.params = params; self.ret_type = ret_type; self.body = body
class ClassDecl(Node):
    def __init__(self, name, members): self.name = name; self.members = members
class CompDecl(Node):
    def __init__(self, name, members): self.name = name; self.members = members
class IfStmt(Node):
    def __init__(self, cond, then_b, else_b): self.cond = cond; self.then_b = then_b; self.else_b = else_b
class WhileStmt(Node):
    def __init__(self, cond, body): self.cond = cond; self.body = body
class ForStmt(Node):
    def __init__(self, init, cond, inc, body): self.init = init; self.cond = cond; self.inc = inc; self.body = body
class PrintStmt(Node):
    def __init__(self, expr): self.expr = expr
class ReturnStmt(Node):
    def __init__(self, expr): self.expr = expr
class ExprStmt(Node):
    def __init__(self, expr): self.expr = expr

class Literal(Node):
    def __init__(self, value): self.value = value
class Identifier(Node):
    def __init__(self, name): self.name = name
class BinaryExpr(Node):
    def __init__(self, left, op, right): self.left = left; self.op = op; self.right = right
class AssignExpr(Node):
    def __init__(self, left, right): self.left = left; self.right = right
class CallExpr(Node):
    def __init__(self, callee, args): self.callee = callee; self.args = args
class MemberAccessExpr(Node):
    def __init__(self, object_, property_): self.object = object_; self.property = property_
class NewExpr(Node):
    def __init__(self, class_name): self.class_name = class_name

# ===============================
# 3. PARSER
# ===============================
class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def current(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None
        
    def previous(self):
        return self.tokens[self.pos - 1]
        
    def is_at_end(self):
        return self.pos >= len(self.tokens)
        
    def check(self, type_, val=None):
        if self.is_at_end(): return False
        tok = self.current()
        if tok.type != type_: return False
        if val and tok.val != val: return False
        return True
        
    def match(self, type_, val=None):
        if self.check(type_, val):
            self.pos += 1
            return True
        return False
        
    def consume(self, type_, val=None):
        if self.check(type_, val):
            self.pos += 1
            return self.previous()
        tok = self.current()
        loc = f"at line {tok.line} col {tok.col}" if tok else "at EOF"
        expected = val if val else type_
        raise Exception(f"Syntax Error {loc}: Expected {expected}, got {tok.type if tok else 'EOF'}")

    def parse_program(self):
        stmts = []
        while not self.is_at_end():
            stmts.append(self.parse_decl())
        return stmts
        
    def parse_decl(self):
        if self.match('KW_PACKAGE'): return self.parse_package()
        if self.match('KW_LET'): return self.parse_var_decl()
        if self.match('KW_CONST'): return self.parse_const_decl()
        if self.match('KW_FUN'): return self.parse_fun_decl()
        if self.match('KW_CLASS'): return self.parse_class_decl()
        if self.match('KW_COMP'): return self.parse_comp_decl()
        return self.parse_stmt()

    def parse_package(self):
        self.consume('KW_IN')
        path = [self.consume('IDENT').val]
        while self.match('DOT'):
            path.append(self.consume('IDENT').val)
        self.consume('PUNCT', ';')
        return PackageStmt(".".join(path))

    def parse_var_decl(self):
        name = self.consume('IDENT').val
        self.consume('DOT')
        type_name = self.consume('IDENT').val
        init_expr = None
        if self.match('ASSIGN'):
            init_expr = self.parse_expr()
        self.consume('PUNCT', ';')
        return VarDecl(name, type_name, init_expr)

    def parse_const_decl(self):
        name = self.consume('IDENT').val
        self.consume('DOT')
        type_name = self.consume('IDENT').val
        self.consume('ASSIGN')
        init_expr = self.parse_expr()
        self.consume('PUNCT', ';')
        return ConstDecl(name, type_name, init_expr)

    def parse_fun_decl(self):
        name = self.consume('IDENT').val
        self.consume('PUNCT', '(')
        params = []
        if not self.check('PUNCT', ')'):
            pname = self.consume('IDENT').val
            self.consume('DOT')
            ptype = self.consume('IDENT').val
            params.append({'name': pname, 'type': ptype})
            while self.match('PUNCT', ','):
                pname = self.consume('IDENT').val
                self.consume('DOT')
                ptype = self.consume('IDENT').val
                params.append({'name': pname, 'type': ptype})
        self.consume('PUNCT', ')')
        ret_type = "void"
        if self.match('ARROW'):
            ret_type = self.consume('IDENT').val
        self.consume('PUNCT', '{')
        body = self.parse_block()
        return FunDecl(name, params, ret_type, body)

    def parse_class_decl(self):
        name = self.consume('IDENT').val
        self.consume('PUNCT', '{')
        members = []
        while not self.check('PUNCT', '}'):
            if self.match('KW_LET'):
                members.append(self.parse_var_decl())
            elif self.match('KW_FUN'):
                members.append(self.parse_fun_decl())
            else:
                raise Exception("Invalid member in class")
        self.consume('PUNCT', '}')
        return ClassDecl(name, members)

    def parse_comp_decl(self):
        name = self.consume('IDENT').val
        self.consume('PUNCT', '{')
        members = []
        while not self.check('PUNCT', '}'):
            if self.match('KW_LET'):
                members.append(self.parse_var_decl())
            elif self.match('KW_FUN'):
                members.append(self.parse_fun_decl())
            else:
                raise Exception("Invalid member in componente")
        self.consume('PUNCT', '}')
        return CompDecl(name, members)

    def parse_stmt(self):
        if self.match('KW_IF'): return self.parse_if()
        if self.match('KW_WHILE'): return self.parse_while()
        if self.match('KW_FOR'): return self.parse_for()
        if self.match('KW_RETURN'): return self.parse_return()
        if self.match('KW_PRINT'): return self.parse_print()
        if self.match('PUNCT', '{'): return self.parse_block()
        if self.match('KW_LET'): return self.parse_var_decl()
        return self.parse_expr_stmt()

    def parse_block(self):
        stmts = []
        while not self.check('PUNCT', '}') and not self.is_at_end():
            stmts.append(self.parse_decl())
        self.consume('PUNCT', '}')
        return stmts

    def parse_if(self):
        self.consume('PUNCT', '(')
        cond = self.parse_expr()
        self.consume('PUNCT', ')')
        then_b = self.parse_block() if self.match('PUNCT', '{') else [self.parse_stmt()]
        else_b = None
        if self.match('KW_ELSE'):
            if self.match('KW_IF'):
                else_b = [self.parse_if()]
            else:
                else_b = self.parse_block() if self.match('PUNCT', '{') else [self.parse_stmt()]
        return IfStmt(cond, then_b, else_b)

    def parse_while(self):
        self.consume('PUNCT', '(')
        cond = self.parse_expr()
        self.consume('PUNCT', ')')
        body = self.parse_block() if self.match('PUNCT', '{') else [self.parse_stmt()]
        return WhileStmt(cond, body)

    def parse_for(self):
        self.consume('PUNCT', '(')
        if self.match('KW_LET'): init = self.parse_var_decl()
        else: init = self.parse_expr_stmt()
        
        cond = self.parse_expr()
        self.consume('PUNCT', ';')
        inc = self.parse_expr()
        self.consume('PUNCT', ')')
        
        body = self.parse_block() if self.match('PUNCT', '{') else [self.parse_stmt()]
        return ForStmt(init, cond, inc, body)

    def parse_print(self):
        self.consume('PUNCT', '(')
        expr = self.parse_expr()
        self.consume('PUNCT', ')')
        self.consume('PUNCT', ';')
        return PrintStmt(expr)

    def parse_return(self):
        expr = None
        if not self.check('PUNCT', ';'):
            expr = self.parse_expr()
        self.consume('PUNCT', ';')
        return ReturnStmt(expr)

    def parse_expr_stmt(self):
        expr = self.parse_expr()
        self.consume('PUNCT', ';')
        return ExprStmt(expr)

    def parse_expr(self):
        return self.parse_assign()

    def parse_assign(self):
        expr = self.parse_logical()
        if self.match('ASSIGN'):
            right = self.parse_assign()
            return AssignExpr(expr, right)
        return expr

    def parse_logical(self):
        left = self.parse_equality()
        while self.match('OP_LOG'):
            op = self.previous().val
            right = self.parse_equality()
            left = BinaryExpr(left, op, right)
        return left

    def parse_equality(self):
        left = self.parse_relational()
        while self.match('OP_REL', '==') or self.match('OP_REL', '!='):
            op = self.previous().val
            right = self.parse_relational()
            left = BinaryExpr(left, op, right)
        return left

    def parse_relational(self):
        left = self.parse_additive()
        while self.match('OP_REL', '<') or self.match('OP_REL', '<=') or self.match('OP_REL', '>') or self.match('OP_REL', '>='):
            op = self.previous().val
            right = self.parse_additive()
            left = BinaryExpr(left, op, right)
        return left

    def parse_additive(self):
        left = self.parse_multiplicative()
        while self.match('OP_ARITH', '+') or self.match('OP_ARITH', '-'):
            op = self.previous().val
            right = self.parse_multiplicative()
            left = BinaryExpr(left, op, right)
        return left

    def parse_multiplicative(self):
        left = self.parse_call()
        while self.match('OP_ARITH', '*') or self.match('OP_ARITH', '/'):
            op = self.previous().val
            right = self.parse_call()
            left = BinaryExpr(left, op, right)
        return left

    def parse_call(self):
        expr = self.parse_primary()
        while True:
            if self.match('PUNCT', '('):
                args = []
                if not self.check('PUNCT', ')'):
                    args.append(self.parse_expr())
                    while self.match('PUNCT', ','):
                        args.append(self.parse_expr())
                self.consume('PUNCT', ')')
                expr = CallExpr(expr, args)
            elif self.match('DOT'):
                prop = self.consume('IDENT').val
                expr = MemberAccessExpr(expr, prop)
            else:
                break
        return expr

    def parse_primary(self):
        if self.match('NUMBER'): return Literal(int(self.previous().val))
        if self.match('STRING'): return Literal(self.previous().val[1:-1])
        if self.match('KW_TRUE'): return Literal(True)
        if self.match('KW_FALSE'): return Literal(False)
        if self.match('KW_NEW'):
            class_name = self.consume('IDENT').val
            self.consume('PUNCT', '(')
            self.consume('PUNCT', ')')
            return NewExpr(class_name)
        if self.match('IDENT'): return Identifier(self.previous().val)
        if self.match('PUNCT', '('):
            expr = self.parse_expr()
            self.consume('PUNCT', ')')
            return expr
        tok = self.current()
        raise Exception(f"Expected expression at line {tok.line} col {tok.col}")

# ===============================
# 4. RUNTIME ENVIRONMENT
# ===============================
class ReturnException(Exception):
    def __init__(self, value): self.value = value

class Environment:
    def __init__(self, parent=None):
        self.parent = parent
        self.values = {}
        
    def define(self, name, value):
        self.values[name] = value
        
    def assign(self, name, value):
        if name in self.values:
            self.values[name] = value
            return
        if self.parent:
            self.parent.assign(name, value)
            return
        raise RuntimeError(f"Undefined variable '{name}'")
        
    def get(self, name):
        if name in self.values: return self.values[name]
        if self.parent: return self.parent.get(name)
        raise RuntimeError(f"Undefined variable '{name}'")

class UzFunction:
    def __init__(self, decl, closure):
        self.decl = decl
        self.closure = closure
    def call(self, interpreter, args):
        env = Environment(self.closure)
        for i, param in enumerate(self.decl.params):
            env.define(param['name'], args[i])
        try:
            interpreter.execute_block(self.decl.body, env)
        except ReturnException as r:
            return r.value
        return None

class UzObject:
    def __init__(self, class_decl, global_env, interpreter):
        self.env = Environment(global_env)
        for member in class_decl.members:
            if isinstance(member, VarDecl):
                self.env.define(member.name, None)
            elif isinstance(member, FunDecl):
                self.env.define(member.name, UzMethod(member, self))

class UzComponent(UzObject):
    def __init__(self, comp_decl, global_env, interpreter):
        self.env = Environment(global_env)
        for member in comp_decl.members:
            if isinstance(member, VarDecl):
                val = interpreter.evaluate(member.init_expr, self.env) if member.init_expr else None
                self.env.define(member.name, val)
            elif isinstance(member, FunDecl):
                self.env.define(member.name, UzMethod(member, self))

class UzMethod:
    def __init__(self, decl, obj):
        self.decl = decl
        self.obj = obj
    def call(self, interpreter, args):
        env = Environment(self.obj.env)
        for i, param in enumerate(self.decl.params):
            env.define(param['name'], args[i])
        try:
            interpreter.execute_block(self.decl.body, env)
        except ReturnException as r:
            return r.value
        return None

# ===============================
# 5. INTERPRETER
# ===============================
class Interpreter:
    def execute_block(self, stmts, env):
        for stmt in stmts: self.execute(stmt, env)

    def execute(self, stmt, env):
        if isinstance(stmt, PackageStmt): pass
        elif isinstance(stmt, VarDecl) or isinstance(stmt, ConstDecl):
            val = self.evaluate(stmt.init_expr, env) if stmt.init_expr else None
            env.define(stmt.name, val)
        elif isinstance(stmt, FunDecl):
            env.define(stmt.name, UzFunction(stmt, env))
        elif isinstance(stmt, ClassDecl):
            env.define(stmt.name, stmt)
        elif isinstance(stmt, CompDecl):
            env.define(stmt.name, stmt)
        elif isinstance(stmt, IfStmt):
            if self.evaluate(stmt.cond, env):
                self.execute_block(stmt.then_b, Environment(env))
            elif stmt.else_b:
                self.execute_block(stmt.else_b, Environment(env))
        elif isinstance(stmt, WhileStmt):
            while self.evaluate(stmt.cond, env):
                self.execute_block(stmt.body, Environment(env))
        elif isinstance(stmt, ForStmt):
            for_env = Environment(env)
            if stmt.init: self.execute(stmt.init, for_env)
            while self.evaluate(stmt.cond, for_env):
                self.execute_block(stmt.body, Environment(for_env))
                self.evaluate(stmt.inc, for_env)
        elif isinstance(stmt, PrintStmt):
            val = self.evaluate(stmt.expr, env)
            def to_str(v):
                if isinstance(v, bool): return "true" if v else "false"
                return str(v)
            print(to_str(val))
        elif isinstance(stmt, ReturnStmt):
            val = self.evaluate(stmt.expr, env) if stmt.expr else None
            raise ReturnException(val)
        elif isinstance(stmt, ExprStmt):
            self.evaluate(stmt.expr, env)

    def evaluate(self, expr, env):
        if isinstance(expr, Literal): return expr.value
        elif isinstance(expr, Identifier): return env.get(expr.name)
        elif isinstance(expr, BinaryExpr):
            l = self.evaluate(expr.left, env)
            r = self.evaluate(expr.right, env)
            op = expr.op
            if op == '+':
                if isinstance(l, str) or isinstance(r, str):
                    def to_str(v):
                        if isinstance(v, bool): return "true" if v else "false"
                        return str(v)
                    return to_str(l) + to_str(r)
                return l + r
            elif op == '-': return l - r
            elif op == '*': return l * r
            elif op == '/': return l // r
            elif op == '==': return l == r
            elif op == '!=': return l != r
            elif op == '<': return l < r
            elif op == '<=': return l <= r
            elif op == '>': return l > r
            elif op == '>=': return l >= r
            elif op == '&&': return bool(l) and bool(r)
            elif op == '||': return bool(l) or bool(r)
        elif isinstance(expr, AssignExpr):
            val = self.evaluate(expr.right, env)
            if isinstance(expr.left, Identifier):
                env.assign(expr.left.name, val)
            elif isinstance(expr.left, MemberAccessExpr):
                obj = self.evaluate(expr.left.object, env)
                obj.env.assign(expr.left.property, val)
            return val
        elif isinstance(expr, CallExpr):
            callee = self.evaluate(expr.callee, env)
            args = [self.evaluate(a, env) for a in expr.args]
            return callee.call(self, args)
        elif isinstance(expr, MemberAccessExpr):
            obj = self.evaluate(expr.object, env)
            return obj.env.get(expr.property)
        elif isinstance(expr, NewExpr):
            class_decl = env.get(expr.class_name)
            return UzObject(class_decl, env, self)

    def run(self, program_code):
        lexer = Lexer(program_code)
        parser = Parser(lexer.tokens)
        ast = parser.parse_program()
        global_env = Environment()
        for stmt in ast:
            self.execute(stmt, global_env)
        
        # Encontra o primeiro Componente e executa o render()
        for name, val in global_env.values.items():
            if isinstance(val, CompDecl):
                comp = UzComponent(val, global_env, self)
                if 'render' in comp.env.values:
                    comp.env.get('render').call(self, [])
                break

# ===============================
# 6. EXECUÇÃO PRINCIPAL
# ===============================
if __name__ == '__main__':
    code = """
    package in test.logic;

    e.const appName.str = "UpperZetta Test";

    fun canVote(age.int) >> boolean {
        if (age >= 16) {
            return true;
        } else {
            return false;
        }
    }

    fun classifyAge(age.int) >> str {
        if (age < 12) {
            return "child";
        } else if (age < 18) {
            return "teen";
        } else if (age < 60) {
            return "adult";
        } else {
            return "elder";
        }
    }

    fun scoreMessage(score.int) >> str {
        if (score >= 90) {
            return "excellent";
        } else if (score >= 70) {
            return "good";
        } else if (score >= 50) {
            return "ok";
        } else {
            return "fail";
        }
    }

    class.public User {
        let name.str;
        let age.int;
        let active.boolean;

        fun isAdult() >> boolean {
            return age >= 18;
        }

        fun canEnter() >> boolean {
            if (active == true && age >= 18) {
                return true;
            } else {
                return false;
            }
        }

        fun profileLabel() >> str {
            if (active == false) {
                return "inactive";
            } else if (age < 18) {
                return "minor";
            } else {
                return "active_adult";
            }
        }
    }

    componente Home {
        let title.str = "Condition Test";

        fun render() {
            let age.int = 21;
            let score.int = 87;
            let online.boolean = true;
            let attempts.int = 0;

            System.print(title);
            System.print(appName);
            System.print(classifyAge(age));
            System.print(scoreMessage(score));

            if (canVote(age)) {
                System.print("can vote");
            } else {
                System.print("cannot vote");
            }

            if (online == true && score >= 70) {
                System.print("approved and online");
            } else {
                System.print("not approved");
            }

            while (attempts < 3) {
                System.print("attempt: " + attempts);
                attempts = attempts + 1;
            }

            for (let i.int = 0; i < 5; i = i + 1) {
                System.print("index: " + i);
            }
        }
    }
    """
    
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r') as f:
            code = f.read()

    interpreter = Interpreter()
    interpreter.run(code)
