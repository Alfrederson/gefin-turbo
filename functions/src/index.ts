import * as functions from "firebase-functions"
import { Request, Response } from "firebase-functions"
 import { DocumentSnapshot, QuerySnapshot, Transaction } from "firebase-admin/firestore"

import { Data, Operacao, c , Categorias } from "./estruturas"
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
        const
            transacao = valida.Transacao(req),
            op = transacao.op,
            data:Data = util.dataIso(op.data)

        valida.Data(data.dd, data.mm, data.yyyy)
        if(!op.descricao || op.descricao == "") 
            throw("Descrição inválida: "+op.descricao)

        if(!op.valor || op.valor <= 0 || isNaN(op.valor))
            throw("Valor inválido: "+op.valor)

        const 
            id      = util.geraId(data.yyyy, data.mm, op.descricao),
            caminho = [c.USERS,transacao.u.id,op.tipo].join("/"),
            obj:Operacao = {
                descricao : transacao.op.descricao,
                valor : transacao.op.valor,
                data : data.iso,
                id : id
            }        
        
        if(transacao.op.tipo === c.DESPESA) 
            obj.categoria = transacao.op.categoria 
        
        await db.collection(caminho).doc(id).create(obj)

        /*
        NOTA: não vem ao caso exatamente agora, mas a intenção é quebrar a descrição e 
              construir um índice no banco de dados onde cada palavra tenha uma lista de transações
              onde ela é citada dentro da descrição.
        let tags = transacao.op.descricao.toLowerCase().split(" ")
        console.log("Inserir a transação "+id+" nos tags ["+tags.join("/")+"] da pasta "+op.tipo )
        */

        res.status(201).json({msg:"Operação registrada.", id:id})        
    }catch(e){
        res.status(400).send("Erro na criação do registro:\n"+e)
    }
}

// GET /x/id
async function detalha(req:Request, res:Response){
    try{
        const 
            transacao = valida.Transacao(req),
            id = valida.Id(transacao.op.id),
            caminho : string = [transacao.u.id,transacao.op.tipo, id ].join("/"),
            r = await db.collection(c.USERS).doc(caminho).get()
        res.status(200).json(  r.data() )
    }catch(e){
        res.status(400).send("Erro procurando o registro:\n"+e)
    }
}

// PUT /x/id
async function atualiza(req:Request, res:Response){
    try{
        const 
            transacao = valida.Transacao(req),
            original  =  valida.Id(transacao.op.id),
            op = transacao.op,
            data = util.dataIso(op.data),
        
            id = util.geraId(data.yyyy, data.mm, op.descricao),
            pasta = [c.USERS, transacao.u.id, op.tipo].join("/"),
            alterado:Operacao = {
            descricao : transacao.op.descricao,
                valor : transacao.op.valor,
                    data : data.iso,
                    id : id
            } 

        if(op.tipo === c.DESPESA)
            alterado.categoria = transacao.op.categoria || Categorias.OUTRAS

        // compara o id original com o id novo pra ver se vai ter só update ou se vai ser desmaterialização e rematerialização
        if(original === id)
            await db.collection(pasta).doc(id).update({ ...alterado, exists: true} ) 
        else
            // se qualquer uma das alterações falhar, a transação inteira é revertida,
            // então não existe o risco de apagar o original
            await db.runTransaction( async (t:Transaction) =>
                t.delete(db.collection(pasta).doc(original) , {exists:true} ) 
                 .create(db.collection(pasta).doc(id), alterado)
            )  
        res.status(200).json({msg : "Operação alterada." , anterior : original, id : id})

    }catch(e){
        res.status(400).send("Erro atualizando o registro:\n"+e)
    }
}

// DELETE /x/id
async function exclui(req:Request, res:Response){
    try{
        const
            transacao = valida.Transacao(req),
            id = valida.Id(transacao.op.id)
        await db.collection([c.USERS,transacao.u.id,transacao.op.tipo].join("/")).doc(id).delete({exists : true})
        res.status(200).json({msg : "Operação removida.", id: id})
    }catch(e){
        res.status(400).send("Erro eliminando o registro:\n"+e)
    }
}

// GET /x?descricao=y => procura por descrição = y
// GET /x             => mostra todas as operações

async function busca(req:Request, res:Response){
    try{
        const
            consulta = valida.Consulta( req ),    
            q = Object.entries(req.query),
            ref = db.collection(c.USERS+"/"+consulta.u.id+"/"+consulta.p.tipo),
            record: QuerySnapshot  = await ref.get()
        let
            result: (FirebaseFirestore.DocumentData | undefined)[] = record.docs.map( (d:DocumentSnapshot) => d.data() )
        
        // Realiza busca linear pela descrição
        if(q.length > 0)
            if(req.query.descricao){
                let d = (req.query.descricao as string) .toLowerCase()
                // filtrar tudo por descrição
                result = result.filter( r =>{
                    let desc = util.decodaId(r?.id)
                    return desc.includes( d )
                })
            }
        res.status(200).json(result)
    }catch(e){
        res.status(400).send("Erro alterando a operação:\n"+e)
    }
}

// GET /op/yyyy/mm => mostra todas as op do mês mm do ano yyyy
async function mensal(req:Request, res:Response){
    try{
        const
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
        const
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
                
            if(despesas_categorizadas[c])
                despesas_categorizadas[c] += v
            else
                despesas_categorizadas[c] = v

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
