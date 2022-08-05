import * as functions from "firebase-functions"
import { Request, Response } from "firebase-functions"
import { DocumentSnapshot, Transaction } from "firebase-admin/firestore"
import Base62Str from "base62str"

// se prepaaaaaaaaaara
const 
    express = require("express"),
    admin = require("firebase-admin"),
    app = express(),
    base62 = Base62Str.createInstance(),
    USERS = "usuarios",
    RECEITA = "receitas",
    DESPESA = "despesas"

admin.initializeApp()

interface Operacao {
    id : string,
    descricao : string,
    valor : number,
    data : string,
    tipo : string
}

interface Usuario {
    id : string
}

interface Transacao {
    op : Operacao,
    u  : Usuario
}

class Data{
    yyyy : string = "";
    mm : string ="";
    dd : string = "";
    iso : string = "";
    valida : boolean = false
}

const db = admin.firestore()

// categoria pode ser despesa ou receita
const extraiOperacao = (req:Request) =>{
    // determina a operação (receita ou despesa) a partir do primeiro elemento da url
    let op = req.path.substring(1).toLowerCase().split("/")[0]
    if(RECEITA !== op && DESPESA !== op) // nem um, nem outro? tchau
        return null
    else
        return{
            id        : req.body.id || req.params.id,
            descricao : req.body.descricao,
            valor     : parseFloat( req.body.valor ),
            data      : req.body.data,
            tipo      : op}
}

const validaData = (dia : number, mes : number, ano : number) => {
	if(dia < 0 || dia > 31) return false
    if(mes < 0 || mes > 12) return false
    if(ano < 0) return false
    if(isNaN(dia) || isNaN(mes) || isNaN(ano)) return false
	let bissexto = ano % 4 === 0 ? 1 : 0
	let meses = [
        31, // janeiro
        28 + bissexto, // fevereiro
        31, // marco
        30, // abril
        31, // maio
        30, // junho
        31, // julho
        31, // agosto
        30, // setembro
        31, // outubro
        30, // novembro
        31  // dezembro
    ]
  if(dia > meses[mes-1]) return false
  return true
}

const geraId = (path : string) => base62.encodeStr(path)


// id = ${data.iso}/${op.descricao}
const validaId = (id : string) =>{
    let s = base62.decodeStr(id)
    let partes = s.split("/")
    if(partes.length !== 2)
        return false
    if(partes[0].length!==7){
        return false
    }
        
    let data = partes[0].split("-")
    if(data.length !== 2)
        return false
    if(!validaData(1,parseInt(data[1]),parseInt(data[0])))
        return false
    // só isso
    return true
}
const data_iso = (data:string) =>{
    if(data.length == 8){
        let s:Data = {
            yyyy : data.substring(0,4),
            mm   : data.substring(4,6),
            dd   : data.substring(6,8),
            iso  : "",
            valida : true
        }
        s.iso = s.yyyy + "-" + s.mm + "-" + s.dd
        if(validaData( parseInt(s.dd), parseInt(s.mm), parseInt(s.yyyy) ))
        return s    // data naquele formato lá de cima.        
    }
    return new Data() // data inválida
}
    
// usar o google auth sei lá o que da vida pra pegar um
// id de usuário enviado junto com a request.
// por enquanto tudo vai ser feito no mesmo registro.
const extraiUsuario = (req:Request) =>({
    id : "mula"
})

const validarTransacao = (req:Request, res:Response, sucesso:(arg0:Transacao, arg1: Response)=>void) =>{
    let _op = extraiOperacao(req)
    if(!_op){
        res.status(400)
        res.send("Operação inválida.")
        return
    }
    let _usuario = extraiUsuario(req)
    if(!_usuario){
        res.status(400)
        res.send("Usuário inválido.")
        return
    }
    // suuuuceeesso
    sucesso({
        u : _usuario,
        op : _op
    }, res)
}

// cadastra operação
async function cria(req:Request, res:Response){
    // receita ou despesa vem de dentro da URL.
    // essas coisas que são repetidas provavelmente podem virar algum tipo de 
    // operação funcional ou promise ou alguma besteira assim.
    // já está confuso o bastante do jeito que está.
    // mas se der, dá pra eliminar 10 linhas de código.
    validarTransacao(req,res, async (transacao, res)=>{
        try{
            let op = transacao.op,
                data:Data = data_iso(op.data)
            // valida data
            if(!data.valida)
                throw("Data inválida")
            
            // valida descrição
            if(!op.descricao || op.descricao == "") 
                throw("Descrição inválida: "+op.descricao)
            
            // valida valor
            if(!op.valor || op.valor <= 0 || isNaN(op.valor))
                throw("Valor inválido: "+op.valor)
            
            // ano / mes / pasta / desc
            const id      = geraId(`${data.yyyy}-${data.mm}/${op.descricao}`),
                  caminho = [USERS,transacao.u.id,op.tipo].join("/")

            // criar o documento na coleção usuário/[receita|despesa]/id
            await db.collection(caminho).doc(id).create(
                {descricao : transacao.op.descricao,
                valor : transacao.op.valor,
                 data : data.iso,
                   id : id}
            )

            res.status(200)
            res.json({msg:"Operação registrada.", id:id})
            return
        }catch(e){
            res.status(400)
            res.send("Erro na criação do registro:\n"+e)
        } 
    })
}

// GET /x
async function lista(req:Request, res:Response){
    // traversal de árvore da esquerda pra direita
    validarTransacao(req, res, async (transacao, res)=>{
        let result: (FirebaseFirestore.DocumentData | undefined)[] = [],
            record = await db.collection(USERS+"/"+transacao.u.id+"/"+transacao.op.tipo).get()
        record.forEach( (d:DocumentSnapshot) =>{
            result.push(d.data())
        })
        res.status(200)
        res.json(result)
    })
}

// GET /x/id
async function detalha(req:Request, res:Response){
    validarTransacao(req, res, async (transacao, res)=>{
        try{
            if(!validaId(transacao.op.id))
                throw("ID inválido.")
            const caminho : string = [transacao.u.id,transacao.op.tipo,transacao.op.id].join("/")
            let r2 = await db.collection(USERS).doc(caminho).get()
            res.status(200)
            res.json(  r2.data() )
        }catch(e){
            res.status(400)
            res.send("Erro procurando o registro:\n"+e)
        }
    })
}

// PUT /x/id
async function atualiza(req:Request, res:Response){
    validarTransacao(req, res, async (transacao, res)=>{
        try{
            if(!validaId(transacao.op.id))
                throw("Id de transação inválida.")
            let op = transacao.op,
                data:Data = data_iso(op.data)
            // ver se a pessoa está tentando editar algum documento válido.
            const original = transacao.op.id,  
                 id = geraId(`${data.yyyy}-${data.mm}/${op.descricao}`),
                 pasta = [USERS,transacao.u.id,op.tipo].join("/"),
                 alterado = {descricao : transacao.op.descricao,
                                 valor : transacao.op.valor,
                                  data : data.iso,
                                    id : id}

            let anterior:DocumentSnapshot = await db.collection(pasta).doc(original).get()
            // se mudar a data 
            // se existe vou poder ou alterar ou deletar e recriar.
            if(anterior.exists){
                if(original !== id){
                    // apaga o registro existente e cria um novo.
                    await db.runTransaction( async (t:Transaction) =>{
                        t.create(db.collection(pasta).doc(id), alterado)
                         .delete(db.collection(pasta).doc(original))
                    })
                }else{
                    // atualiza o registro existente.
                    await db.collection(pasta).doc(id).update(alterado)
                }        
            }else{
                throw "Operação "+original+" não existe."
            }
            res.status(200)
            res.json({msg : "Operação modificada." , id : id})
        }catch(e){
            res.status(400)
            res.send("Erro alterando a operação:\n"+e)
        }
    })
}

// DELETE /x/id
async function exclui(req:Request, res:Response){
    validarTransacao(req, res, async (transacao, res)=>{
        try{
            if(!validaId(transacao.op.id))
                throw("ID inválido.")
            // exclui da lista
            await db.collection([USERS,transacao.u.id,transacao.op.tipo].join("/")).doc(transacao.op.id).delete()
            res.status(200)
            res.json({msg : "Operação removida.", id: transacao.op.id})
        }catch(e){
            res.status(400)
            res.send("Erro eliminando o registro:\n"+e)
        }
    })
}

[RECEITA,DESPESA].map( x =>{
    app.post  (`/${x}`,     cria)     //
    app.get   (`/${x}`,     lista)
    app.get   (`/${x}/:id`, detalha)  //
    app.put   (`/${x}/:id`, atualiza) //
    app.delete(`/${x}/:id`, exclui)   //
})

exports.app = functions.https.onRequest(app)
