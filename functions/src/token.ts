import { Request } from "firebase-functions"
import { extrai } from "./extracao"
import { util } from "./utilidade"
const crypto = require("crypto")

/*
    token jwt = é o seguinte:
    - um header indicando o tipo de criptografia
    - um payload contendo os dados que eu quero armazenar no token
    - uma assinatura indicando que foi o meu sistema que gerou o token.

    Isso facilita a vida em caso de ambientes serverless porque evita que a gente
    fique armazenando informações de sessão em algum lugar.

    No entanto, esse sistema é extremamente falho.
    Qualquer pessoa que tenha acesso à chave secreta é capaz de gerar tokens
    que o servidor vai reconhecer como tendo vindo dele.

    Algo que seria mais adequado equivale ao armazenamento de sessão do lado
    do servidor, e isso seria um sistema com um dicionário de id de dispositivo / tokens.

    Cada requisição que enviasse um token de autenticação seria validada
    contra esse dicionário, que poderia ser mantido apenas em memória.

    Não sei se o 0Auth funciona assim, se o Google Authentication funciona assim.
    Se eu fosse fazer do zero, faria assim.

    O usuário precisaria concordar com o fingerprinting de dispositivo para usar
    o serviço.

    O que eu bolei aqui é semelhante em funcionamento ao JWT, mas não segue
    padrão nenhuma. Essa escolha foi deliberada.

*/

export 
    const token = {
        extrair : (req:Request) =>{
            const mensagem = "Erro autenticando requisição"
            let t = extrai.Cookies(req)
            
            // não gostei dessa repetição de throw.
            if(t["ficha"]){
                let obj, separado
                separado = t["ficha"].split(".")
                if( (separado.length !== 2) || 
                    (!separado[0]) || 
                    (!separado[1])
                )
                    throw mensagem

                if(token.calcularAssinatura( separado[0] ) !== separado[1])
                    throw mensagem
    
                try{
                    obj = JSON.parse( util.decoda62( separado[0] ))
                }catch(e){
                    throw mensagem
                }

                if(!obj.emissao || 
                   !obj.validade )
                    throw "Ficha inválida"

                let agora = util.agora()
                if(agora > obj.emissao + obj.validade)
                    throw "Sessão expirada. Faça login de novo."

                return obj
            }else
            throw "Usuário não autenticado."
        },
        calcularAssinatura : (seq:string) =>{
            return util.encoda62(
                    Buffer.from(
                        crypto.createHmac('sha256', process.env.SEGREDO)
                              .update(seq)
                              .digest()
                               ).toString()
                    )
        },
        gerar : (payload:any) =>{
            let parteA = util.encoda62( JSON.stringify( payload ) )
            let parteB = token.calcularAssinatura(parteA)
            return  parteA+"."+parteB
        }
    }