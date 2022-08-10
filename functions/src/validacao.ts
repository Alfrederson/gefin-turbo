import { util } from "./utilidade"
import { extrai } from "./extracao"
import { Request} from "firebase-functions"

import Base62Str from "base62str"

const base62 = Base62Str.createInstance()

// todas as funções daqui throwan uma mensagem de erro..
export const valida = {
    Data : (dia : number, mes : number, ano : number) => {
        if(dia < 1 || dia > 31) throw `${dia} está fora de 1 a31`
        if(mes < 1 || mes > 12) throw `${mes} está fora de 1 a 12`
        if(ano < 0) throw `${ano} abaixo de zero?`
        if(isNaN(dia) || isNaN(mes) || isNaN(ano)) throw `Algum dos itens ${dia}/${mes}/${ano} não é um número.`
        if(dia > util.diasNoMes(ano,mes)) throw `${mes} de ${ano} não tem ${dia} dias!`
    },

    // id = ${data.iso}/${op.descricao}
    Id : (id : string) =>{
        let s = base62.decodeStr(id)
        let partes = s.split("/")
        if(partes.length !== 2)
            throw("ID não possui data/desc")
        if(partes[0].length!==7){
            throw("ID com data inválida")
        }
            
        let data = partes[0].split("-")
        if(data.length !== 2)
            throw("Formato da data do ID inválido")

        valida.Data(1,parseInt(data[1]),parseInt(data[0]))
        // só isso
        return true
    },
    
    Consulta : (req:Request, espera:string[]=[])=>{
        let _usuario = extrai.Usuario(req)
        if(!_usuario){
            throw("Usuário inválido")
        }
        // sempre vai ter parâmetro de busca.    
        let _parametros = extrai.Parametros(req)
        // checa se tem os parâmetros esperados

        if(espera.length > 0){
            let erros:string[] = []
            espera.map( x => {
                if(!_parametros[x])
                    erros.push("Parâmetro de busca "+x+" inválido.")
            })
            if(erros.length > 0 )
                throw(erros.join("\n"))
            
        }

        return { u :  _usuario, p :_parametros}
    },
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
            op : _op
        }
    }        
}