// categoria pode ser despesa ou receita
// extrai os dados a partir da requisição.
import { Request } from "firebase-functions"
import { c, Parametros, Consulta, Categorias } from "./estruturas"
import { util } from "./utilidade"
import { valida } from "./validacao"
import { token } from "./token"



export const extrai = {
    /** Extrai os cookies de uma requisição. */
    Cookies : (req:Request) =>{
        let cookies:Record<string,string> = {}
        req.headers.cookie?.split(";").forEach( par =>{
            let x = par.split("=")
            cookies[x[0]] = x[1]
        })
        
        return cookies
    },

    Operacao : (req:Request) =>{
        // determina a operação (receita ou despesa) a partir do primeiro elemento da url
        let op = req.path.substring(1).toLowerCase().split("/")[0]
    
        if(c.RECEITA !== op && c.DESPESA !== op) // nem um, nem outro? tchau
            return undefined
        else
            return{
                id        : req.body.id || req.params.id,
                descricao : req.body.descricao,
                categoria : util.padrao(req.body.categoria,Categorias.OUTRAS).toUpperCase(), 
                valor     : parseFloat( req.body.valor ),
                data      : parseInt(req.body.data ),
                tipo      : op}
    },
    // usar o google auth sei lá o que da vida pra pegar um
    // id de usuário enviado junto com a request.
    // por enquanto tudo vai ser feito no mesmo registro.
    Usuario : (req:Request) =>{
        const
            tok = token.extrair(req)
        return {
            id : tok.usuario
        }
    },
    Parametros : (req:Request) =>{
        let op = req.path.substring(1).toLowerCase().split("/")[0]
        let x = req.query.descricao as string
        let _consulta:Parametros = {
            descricao : x || undefined ,       // isso é o que a gente vai buscar no url.
            tipo : op,
            ano : parseInt(req.params.ano) || undefined,
            mes : parseInt(req.params.mes) || undefined
        }
        return _consulta
    },
    /**  extrai um mês a partir do mês especificaod na consulta */
    Mes : (consulta:Consulta) =>{
        let ano = consulta.p.ano as number,
            mes = consulta.p.mes as number
        valida.Data(1,mes,ano)
        let inicio = mes * 100 + ano * 10000,
            fim = inicio + util.diasNoMes(ano,mes)
        return [inicio+1,fim]
    }    

}


