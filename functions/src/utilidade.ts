import Base62Str from "base62str"
import { Data } from "./estruturas"

const base62 = Base62Str.createInstance()

export const util = {
    padrao : (x:any,y:any) => x || y,
    geraId : (path : string) => base62.encodeStr(path),
    decodaId : (id : string) => base62.decodeStr(id),
    diasNoMes : (ano:number, mes:number)=>{
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
        return meses[mes-1]
    },
    dataIso : (data:number) =>{
        let d = data.toString()
        if(d.length == 8){
            let s:Data = {
                yyyy : parseInt(d.substring(0,4)),
                mm   : parseInt(d.substring(4,6)),
                dd   : parseInt(d.substring(6,8)),
                iso  : 0,
                valida : true
            }
            if(s.yyyy && s.mm && s.dd){
                s.iso = s.yyyy * 10000 + s.mm * 100 + s.dd
                return s    // data naquele formato lá de cima. 
            }
        }
        return new Data() // data inválida
    }
}



