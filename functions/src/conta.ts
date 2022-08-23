import { Request, Response } from "firebase-functions"
import { c } from "./estruturas"
import { db } from "./db"
import { Timestamp } from "firebase-admin/firestore"
import { extrai } from "./extracao"
import { token } from "./token"
import { util } from "./utilidade"

const valida = {
    email : (endereco:string) =>{
        if(!endereco || endereco.length === 0) throw "Cadê o e-mail?"
        const pattern= /^[\w\+-\.]+@([\w-]+\.)+[\w-]{2,4}$/g
        if([...endereco.matchAll(pattern)].length !== 1) "E-mail inválido."
    },
    nome : (nome:string) =>{
        if(!nome) throw "Cadê o nome?"
        if(nome.length < 4) throw "Nome curto demais."
    },
    senha : (senha:string) =>{
        if(!senha) throw "Cadê a senha?"
        if(senha.length < 6) throw "Senha curta demais."
    }
}

export const Conta = {
    cadastra : async(req:Request, res:Response) =>{
        try{
            const
                perfil = {
                    nome : req.body.nome,   // João Feijão
                    email: req.body.email,  // joao@feijao.com
                    senha: req.body.senha,   // feijão
                    criacao: Timestamp.now()
                }
            valida.nome(perfil.nome)
            valida.email(perfil.email)
            valida.senha(perfil.senha)

            perfil.email = perfil.email.toLowerCase().trim()
            perfil.nome  = perfil.nome.trim()

            // hasheia a senha

            let existentes = await db.busca(c.USERS, ["email","=",perfil.email])
            if(existentes.length > 0) throw "Este e-mail já está em uso."
    
            let r = await db.adiciona( c.USERS , perfil )
            res.status(200).send("Usuário cadastrado "+r)

        }catch(e){
            res.status(400).send("Erro cadastrando usuário:\n"+e)
        }
    },
    /** Mostra o perfil correspondente ao token que for enviado nos cookies */
    detalha : async(req:Request, res:Response)=>{
        try{
            const
                usuario = extrai.Usuario(req)
            if(usuario){
                let r = await db.le( c.USERS, usuario.id )
                res.status(200).json(r)
            }else
                throw "Usuário não autenticado."
        }catch(e){
            res.status(400).send("Erro exibindo perfil:\n"+e)
        }
    },
    atualiza : async(req:Request, res:Response) =>{
        // atualizar o perfil
        res.send("Usuário atualizado")
    },
    /** Mock de login usando senha armazenada sem criptografia.
     *  Idealmente a gente deve gerar uma hash da senha.
     */
    login : async(req:Request, res:Response)=>{
        try{
            const 
                credenciais = {
                    email : req.body.email,
                    senha : req.body.senha
                }
            valida.email(credenciais.email)
            valida.senha(credenciais.senha)
            credenciais.email = credenciais.email.toLowerCase().trim()
            let conta = await db.busca(c.USERS, ["email","=",credenciais.email])

            if(conta.length == 1)
                if(conta[0]?.senha === credenciais.senha){
                    const validade = 600
                    let tok = {
                        usuario  : conta[0]?.id,
                        emissao  : util.agora(),
                        validade : validade
                    }
                    res.status(200).cookie("ficha",token.gerar(tok),{httpOnly : true}).send("Logado. Cheque os biscoitos.")
                    return
                }
            throw "Credenciais inválidas. Senha incorreta ou não há uma conta registrada com este e-mail."
        }catch(e){
            res.status(400).send("Erro fazendo login:\n"+e)
        }
    },
    logout: async(req:Request, res:Response)=>{
        try{
            if(extrai.Cookies(req)["ficha"])
                res.status(200).cookie("ficha","",{maxAge: 1},).send("Logout efetuado.")
            else
                throw "Você não está logado, meu filho."
        }catch(e){
            res.status(403).send(e)
        }
    },
    refresh: async(req:Request, res:Response)=>{
        try{
            let ficha = token.extrair(req)
            if(ficha){
                if(ficha.emissao + ficha.validade > util.agora()){
                    ficha.emissao = util.agora()
                    res.status(200)
                       .cookie("ficha",token.gerar(ficha),{httpOnly : true})
                       .send("Token renovado. Cheque os biscoitos.")
                    return
                }
            }
            throw "Você não está logado, meu filho."    
        }catch(e){
            res.status(403).send(e)
        }
    },

    usa : (app:any) =>{
        app.post("/user/signup", Conta.cadastra)
        app.post("/user/signin" , Conta.login)
        app.post("/user/refresh", Conta.refresh)
        app.post("/user/signout", Conta.logout)
        app.get("/user/profile", Conta.detalha)
    }
}