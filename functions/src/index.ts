import * as functions from "firebase-functions"
import { Request, Response } from "firebase-functions"
 import { /*DocumentSnapshot,*/ DocumentSnapshot, QuerySnapshot/*, Transaction*/ } from "firebase-admin/firestore"

import { /*Consulta,*/ Data, Operacao, /*Transacao,*/ c , Categorias } from "./estruturas"
import { util   } from "./utilidade"
import { extrai } from "./extracao"
import { valida } from "./validacao"


// se prepaaaaaaaaaara
const 
    express = require("express"),
    admin = require("firebase-admin"),
    app = express()

admin.initializeApp()
const db = admin.firestore()

    
// cadastra operação
async function cria(req:Request, res:Response){
    // receita ou despesa vem de dentro da URL.
    // essas coisas que são repetidas provavelmente podem virar algum tipo de 
    // operação funcional ou promise ou alguma besteira assim.
    // já está confuso o bastante do jeito que está.
    // mas se der, dá pra eliminar 10 linhas de código.
    try{
        let transacao = valida.Transacao(req)
        let op = transacao.op,
        data:Data = util.dataIso(op.data)
        valida.Data(data.dd, data.mm, data.yyyy)

        if(!op.descricao || op.descricao == "") 
            throw("Descrição inválida: "+op.descricao)

        if(!op.valor || op.valor <= 0 || isNaN(op.valor))
            throw("Valor inválido: "+op.valor)

        const 
            id      = util.geraId(`${data.yyyy}-${data.mm}/${op.descricao}`),
            caminho = [c.USERS,transacao.u.id,op.tipo].join("/")

        let obj:Operacao = {
            descricao : transacao.op.descricao,
            valor : transacao.op.valor,
            data : data.iso,
            id : id
        }        
        
        if(transacao.op.tipo === c.DESPESA) 
            obj.categoria = transacao.op.categoria 
        
        await db.collection(caminho).doc(id).create(obj)

        let tags = transacao.op.descricao.toLowerCase().split(" ")
        console.log("Inserir a transação "+id+" nos tags ["+tags.join("/")+"] da pasta "+op.tipo )

        res.status(200).json({msg:"Operação registrada.", id:id})        
    }catch(e){
        res.status(400).send("Erro na criação do registro:\n"+e)
    }
}

// GET /x/id
async function detalha(req:Request, res:Response){
    try{
        let transacao = valida.Transacao(req)
        valida.Id(transacao.op.id)
        const caminho : string = [transacao.u.id,transacao.op.tipo,transacao.op.id].join("/"),
              r = await db.collection(c.USERS).doc(caminho).get()
        res.status(200).json(  r.data() )
    }catch(e){
        res.status(400).send("Erro procurando o registro:\n"+e)
    }
}

// PUT /x/id
async function atualiza(req:Request, res:Response){
    /*
    validarTransacao(req, res, async (transacao, res)=>{
        try{
            if(!valida.Id(transacao.op.id))
                throw("Id de transação inválida.")
            let op = transacao.op,
                data:Data = data_iso(op.data)
            // ver se a pessoa está tentando editar algum documento válido.
            const original = transacao.op.id,  
                 id = util.geraId(`${data.yyyy}-${data.mm}/${op.descricao}`),
                 pasta = [c.USERS,transacao.u.id,op.tipo].join("/"),
                 alterado = {descricao : transacao.op.descricao,
                              categoria: transacao.op.categoria,
                                 valor : transacao.op.valor,
                                  data : data.iso,
                                    id : id,  
                                   tags: transacao.op.descricao.toLocaleLowerCase().split(" ")}
            const anterior:DocumentSnapshot = await db.collection(pasta).doc(original).get()
            // se mudar a data 
            // se existe vou poder ou alterar ou deletar e recriar.
            
            if(anterior.exists){
                if(original !== id){
                    
                    // apaga o registro existente e cria um novo.
                    await db.runTransaction( async (t:Transaction) =>{
                        t.create(db.collection(pasta).doc(id), alterado)
                         .delete(db.collection(pasta).doc(original))
                    })
                }else
                    // atualiza o registro existente.
                    await db.collection(pasta).doc(id).update(alterado)    
            }else
                throw "Operação "+original+" não existe."
            res.status(200).json({msg : "Operação modificada." , id : id})
        }catch(e){
            res.status(400).send("Erro alterando a operação:\n"+e)
        }
    })*/
}

// DELETE /x/id
async function exclui(req:Request, res:Response){
    try{
        let transacao = valida.Transacao(req)
        valida.Id(transacao.op.id)
        await db.collection([c.USERS,transacao.u.id,transacao.op.tipo].join("/")).doc(transacao.op.id).delete()
        res.status(200).json({msg : "Operação removida.", id: transacao.op.id})
    }catch(e){
        res.status(400).send("Erro eliminando o registro:\n"+e)
    }
}

// GET /x?descricao=y => procura por descrição = y
// GET /x             => mostra todas as operações

async function busca(req:Request, res:Response){
    try{
        let
            consulta = valida.Consulta( req ),
            result: (FirebaseFirestore.DocumentData | undefined)[] = [],
            record: QuerySnapshot,
            q = Object.entries(req.query),
            ref = db.collection(c.USERS+"/"+consulta.u.id+"/"+consulta.p.tipo)
        
        if(q.length > 0){
            result.push( {msg : "Ainda não sei buscar por descrição."} )
        }else{

        }   
        record = await ref.get()
        result = record.docs.map( (d:DocumentSnapshot) => d.data() )
        res.status(200).json(result)

    }catch(e){
        res.status(400).send("Erro alterando a operação:\n"+e)
    }
    /*
    // tem coisas nos parâmetros?
    validarConsulta(req, res, async (consulta, res)=>{
        let result: (FirebaseFirestore.DocumentData | undefined)[] = [], 
            record: QuerySnapshot

        console.log("Buscando em "+consulta.p.tipo +" "+Object.entries(req.query).join(":"))
        let q = Object.entries(req.query)
        let ref = db.collection(c.USERS+"/"+consulta.u.id+"/"+consulta.p.tipo)

        // ao invés de filtrar todos os documentos checando se a descrição de cada um deles inclui uma palavra,
        // busco a palavra no índice e retorno os documentos que tem ela na descrição
        if(q.length > 0){
            // ref.where() bla bla bla
            let indice = await db.collection(c.USERS+"/"+consulta.u.id+"/indice").doc(consulta.p.tipo).get() // precisa disso?
            let espaco_de_busca = indice.data()
            console.log("Pesquisar "+consulta.p.descricao)
            Object.entries( espaco_de_busca.tags ).map( (value : any[]) =>{
                console.log(value[0] +" parece com "+consulta.p.descricao+"?")
                console.log(value[1].join("-"))
            })
        }
    })*/
}


// GET /op/yyyy/mm => mostra todas as op do mês mm do ano yyyy
async function mensal(req:Request, res:Response){
    try{
        let
            consulta = valida.Consulta(req, ["mes","ano"]),
            [inicio,fim] = extrai.Mes(consulta),
            record = await db.collection(c.USERS+"/"+consulta.u.id+"/"+consulta.p.tipo)
                                .where('data', '>=', inicio)
                                .where('data', '<=', fim)
                                .get(),
            result = record.docs.map((d:DocumentSnapshot) => d.data())
        res.status(200).json({ inicio: inicio, fim: fim  , resultado : result})
    }catch(e){
        res.status(400).send("Erro realizando busca:\n"+e)
    }
}
// GET resumo/yyyy/mm => gera um resumo do mês mm do ano yyyy
async function resumo(req:Request, res:Response){
    try{
        let
            consulta = valida.Consulta(req, ["mes","ano"]),
            [inicio,fim] = extrai.Mes(consulta),
            receitas = await db.collection(c.USERS+"/"+consulta.u.id+"/receitas")
                                .where('data', '>=', inicio)
                                .where('data', '<=', fim)
                                .get(),

            despesas = await db.collection(c.USERS+"/"+consulta.u.id+"/despesas")
                                .where('data', '>=', inicio)
                                .where('data', '<=', fim)
                                .get(),
            resumo = {
                inicio   : inicio,
                fim      : fim,
                receitas : 0,
                despesas : 0,
                saldo    : 0, 
            },
            despesas_categorizadas : Record<string,number> = {}

        receitas.docs?.map( (e:DocumentSnapshot) => resumo.receitas += util.padrao(e.data()?.valor,0) )
        despesas.docs?.map( (e:DocumentSnapshot) => {
            let d = e.data(),
                c = util.padrao( d?.categoria , Categorias.OUTRAS ),
                v = util.padrao( d?.valor,0)
            if(despesas_categorizadas[c]){
                despesas_categorizadas[c] += v
            }else{
                despesas_categorizadas[c] = v
            }
            resumo.despesas += v
        })        
        resumo.saldo = resumo.receitas - resumo.despesas

        res.status(200).json({...resumo, categorias: despesas_categorizadas})
    }catch(e){
        res.status(400).send("Erro elaborando resumo:\n"+e)
    }
}

[c.RECEITA,c.DESPESA].map( x =>{
    app.post  (`/${x}`,    cria)            
    app.get   (`/${x}`,    busca)           // também inclui ?descricao=x
    app.get   (`/${x}/:ano/:mes`, mensal)   
    app.get   (`/${x}/:id`, detalha)  
    app.put   (`/${x}/:id`, atualiza) 
    app.delete(`/${x}/:id`, exclui)   
})

app.get (`/resumo/:ano/:mes`, resumo)

exports.app = functions.https.onRequest(app)
