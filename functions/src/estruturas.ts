export 

const c = {
    USERS : "usuarios",
    RECEITA : "receitas",
    DESPESA : "despesas"
},

Categorias = {
    OUTRAS : "outras"
}


export interface Operacao {
    id : string,
    descricao : string,
    categoria? : string,
    valor : number,
    data  : number,
    tipo? : string,
    tags? : string[]
}

export interface Usuario {
    id : string
}

export interface Transacao {
    op : Operacao,
    u  : Usuario
}

export type Parametros = Record<string, number | string | undefined>

export interface Consulta {
    p          : Parametros,
    u          : Usuario
}

export class Data{
    yyyy : number = NaN;
    mm   : number = NaN;
    dd   : number = NaN;
    iso  : number = NaN;
    valida : boolean = false
}