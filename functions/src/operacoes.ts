import { Request, Response } from "firebase-functions"
import { Data, Operacao, c , Categorias } from "./estruturas"
import { util   } from "./utilidade"
import { extrai } from "./extracao"
import { valida } from "./validacao"
import { db } from "./db"


export
const Operacoes = {

    // cadastra operação
    cria : async (req:Request, res:Response) => {
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
                obj:Operacao = {
                    descricao : transacao.op.descricao,
                    valor : transacao.op.valor,
                    data : data.iso
                }        
            
            if(transacao.op.tipo === c.DESPESA) 
                obj.categoria = transacao.op.categoria 
            
            await db.cria(transacao.pasta, id, obj)
            
            //

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
    },

    // GET /x/id
    detalha : async (req:Request, res:Response) => {
        try{
            const 
                transacao = valida.Transacao(req),
                id = valida.Id(transacao.op.id),
                // esse lê joga uma exceção se o documento não for encontrado.
                
                r = await db.le(transacao.pasta, id)
            res.status(200).json( r )
        }catch(e){
            res.status(400).send("Erro procurando o registro:\n"+e)
        }
    },

    // PUT /x/id
    atualiza : async (req:Request, res:Response) => {
        try{
            const 
                transacao = valida.Transacao(req),
                original  =  valida.Id(transacao.op.id),
                op = transacao.op,
                data = util.dataIso(op.data),
            
                id = util.geraId(data.yyyy, data.mm, op.descricao),
                alterado:Operacao = {
                    descricao : transacao.op.descricao,
                    valor : transacao.op.valor,
                    data : data.iso
                } 

            if(op.tipo === c.DESPESA)
                alterado.categoria = transacao.op.categoria || Categorias.OUTRAS

            // compara o id original com o id novo pra ver se vai ter só update ou se vai ser desmaterialização e rematerialização
            if(original === id)
                await db.atualiza(transacao.pasta, id, {...alterado, exists: true}) // 
            else
                // se qualquer uma das alterações falhar, a transação inteira é revertida,
                // então não existe o risco de apagar o original
                await db.move(transacao.pasta, original, id, alterado)
            res.status(200).json({msg : "Operação alterada." , anterior : original, id : id})

        }catch(e){
            res.status(400).send("Erro atualizando o registro:\n"+e)
        }
    },

    // DELETE /x/id
    exclui : async (req:Request, res:Response) => {
        try{
            const
                transacao = valida.Transacao(req),
                id = valida.Id(transacao.op.id)
            await db.apaga(transacao.pasta, id)

            res.status(200).json({msg : "Operação removida.", id: id})
        }catch(e){
            res.status(400).send("Erro eliminando o registro:\n"+e)
        }
    },

    // GET /x?descricao=y => procura por descrição = y
    // GET /x             => mostra todas as operações

    busca : async (req:Request, res:Response) => {
        try{
            const
                consulta = valida.Consulta( req ),    
                q = Object.entries(req.query)
            let
                result = await db.busca(consulta.pasta)

            // Realiza busca linear pela descrição
            if(q.length > 0)
                if(req.query.descricao){
                    let d = (req.query.descricao as string) .toLowerCase()
                    // filtra o resultado para mostrar só aqueles que tem d no id (que é a data/descrição)
                    result = result.filter( r => util.decodaId(r?.id).includes( d ) )
                }
            res.status(200).json(result)
        }catch(e){
            res.status(400).send("Erro alterando a operação:\n"+e)
        }
    },

    // GET /op/yyyy/mm => mostra todas as op do mês mm do ano yyyy
    mensal: async (req:Request, res:Response) => {
        try{
            const
                consulta = valida.Consulta(req, ["mes","ano"]),
                [inicio,fim] = extrai.Mes(consulta),
                result = await db.busca(
                    consulta.pasta, 
                    ['data','>=',inicio],
                    ['data','<=',fim]
                )

            res.status(200).json({ inicio: inicio, fim: fim  , resultado : result})
        }catch(e){
            res.status(400).send("Erro realizando busca:\n"+e)
        }
    },
    // GET resumo/yyyy/mm => gera um resumo do mês mm do ano yyyy
    resumo : async (req:Request, res:Response) => {
        try{
            const
                consulta = valida.Consulta(req, ["mes","ano"]),
                [inicio,fim] = extrai.Mes(consulta),
                
                receitas = await db.busca(`${c.USERS}/${consulta.u.id}/receitas`,
                                    ['data','>=',inicio],
                                    ['data','<=',fim]),
                despesas = await db.busca(`${c.USERS}/${consulta.u.id}/despesas`,
                                    ['data','>=',inicio],
                                    ['data','<=',fim]),
                resumo = {
                    inicio   : inicio,
                    fim      : fim,
                    receitas : 0,
                    despesas : 0,
                    saldo    : 0, 
                    categorias  : {} as Record<string,number>
                }
            
            resumo.receitas = receitas.reduce( (p, c) => p + c?.valor || 0, 0 )
            despesas.forEach( d => {
                if(d){
                    let c = d.categoria || Categorias.OUTRAS,
                        v = d.valor
                        resumo.categorias[c] = (resumo.categorias[c] || 0) + v
                        resumo.despesas += v
                }
            })
            resumo.saldo = resumo.receitas - resumo.despesas

            res.status(200).json(resumo)
        }catch(e){
            res.status(400).send("Erro elaborando resumo:\n"+e)
        }
    },
    usa : (app:any) =>{
        [c.RECEITA,c.DESPESA].map( (x:string) =>{
            app.post  (`/${x}`,    Operacoes.cria)            
            app.get   (`/${x}`,    Operacoes.busca)           // também inclui ?descricao=x
            app.get   (`/${x}/:ano/:mes`, Operacoes.mensal)   
            app.get   (`/${x}/:id`,       Operacoes.detalha)  
            app.put   (`/${x}/:id`,       Operacoes.atualiza) 
            app.delete(`/${x}/:id`,       Operacoes.exclui)   
        })
        app.get ('/resumo/:ano/:mes', Operacoes.resumo)
    }
}