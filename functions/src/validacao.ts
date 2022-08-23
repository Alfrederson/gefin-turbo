import { util } from "./utilidade"
import { extrai } from "./extracao"
import { Request} from "firebase-functions"

import Base62Str from "base62str"
import { c } from "./estruturas"

const base62 = Base62Str.createInstance()

// todas as funções daqui throwan uma mensagem de erro..
export const valida = {
    /** Valida uma data. Lança uma exceção se for inválida. */
    Data : (dia : number, mes : number, ano : number) => {
        if(dia < 1 || dia > 31) throw `${dia} está fora de 1 a31`
        if(mes < 1 || mes > 12) throw `${mes} está fora de 1 a 12`
        if(ano < 0) throw `${ano} abaixo de zero?`
        if(isNaN(dia) || isNaN(mes) || isNaN(ano)) throw `Algum dos itens ${dia}/${mes}/${ano} não é um número.`
        if(dia > util.diasNoMes(ano,mes)) throw `${mes} de ${ano} não tem ${dia} dias!`
    },

    // id = yyyy-mm/bla bla bla
    /** Valida o ID de uma transação. Lança exceção se for inválido. */
    Id : (id : string) =>{
        if(!id)
            throw("Cadê o id da operação?")
        let partes = base62.decodeStr(id).split("/")

        if(partes.length !== 2)
            throw("ID não possui data/desc")

        if(!partes[0] || !partes[1])
            throw("ID inválido")

        let data = partes[0].split("-")
        if(data.length !== 2)
            throw("Formato da data do ID inválido")

        valida.Data(1,parseInt(data[1]),parseInt(data[0]))
        // só isso
        return id
    },
    
    /** extrai uma estrutura Consulta de dentro de uma request. espera são parâmetros que a consulta deve ter. 
     * pasta segue o formato usuarios/(id de usuario)/(tipo da operação)
    */
    Consulta : (req:Request, espera:string[]=[])=>{
        let _usuario = extrai.Usuario(req)
        if(!_usuario)
            throw("Usuário inválido")
        // sempre vai ter parâmetro de busca.    
        let _parametros = extrai.Parametros(req)
        // checa se tem os parâmetros esperados

        if(espera.length > 0){
            let erros:string[] = []
            espera.forEach( x => {
                if(!_parametros[x])
                    erros.push("Parâmetro de busca "+x+" inválido.")
            })
            if(erros.length > 0 )
                throw(erros.join("\n"))
            
        }

        return { u :  _usuario, p :_parametros, pasta : c.USERS + "/" + _usuario.id + "/" + _parametros.tipo}
    },
    /** Extrai uma transação de dentro de uma request. Lança uma exceção se for inválida. */
    Transacao : (req:Request) =>{
        let _usuario = extrai.Usuario(req)
        if(!_usuario){
            throw "Usuário inválido."
        }
    
        let _op = extrai.Operacao(req)
        if(!_op){
            throw "Operação inválida"
        }
        // suuuuceeesso
        return {
            u : _usuario,
            op : _op,
            pasta : c.USERS + "/" + _usuario.id + "/" + _op.tipo
        }
    }
}