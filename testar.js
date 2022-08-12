var unirest = require('unirest');

const print = x => console.log(x)

const resultado = x =>{
    if(x.error){
        console.log(" ")    
        console.log(x.raw_body)
        console.log(" ") 
        return x   
    }
    return JSON.parse(x.raw_body)
} 
print("Testando requisições");


const ingredientes = [
    "gato","lesma","cachorro","grama","abelha","peixe","camarão","rato"
],

comidas = [
    "pão", "pastel","sorvete","pudim","filé","geleia","ensopado","sopa","esfirra","panqueca","moqueca"
],

categorias = [
    "Outras",
    "Imprevistos",
    "Lazer",
    "Edudacao",
    "Transporte",
    "Moradia",
    "Saúde",
    "Alimentação"
],

rnd = (minimo,maximo) =>{
	return  minimo + Math.floor(Math.random() * (maximo-minimo) )
}

const inventaDespesa = () =>{
    let
        data = rnd(2014,2020) * 10000 + rnd(1,12) * 100 + rnd(1,31),
        descricao = comidas[ rnd(0, comidas.length) ] + " de "+ingredientes[ rnd(0, ingredientes.length)],
        valor = rnd(100,600),
        categoria = categorias[ rnd(0,categorias.length)]
    
    return {data : data, descricao : descricao, valor : valor, categoria : categoria}
}

const URL = x => "http://localhost:5000"+x ;

const testa_vazio = async (tipo)=>{
    print("agora o banco deve estar vazio.")
    let res = await unirest('GET', URL('/'+tipo+'/'))
    let r = resultado(res)
        if(r.length !== 0) throw "O banco não está vazio"   
}

(async function(){
    let res, r

    let tipo = "despesas"

    // Teste começa com o banco vazio.
    await testa_vazio(tipo)

    // Busco alguma coisa que não existe.
    {
        print("Buscando id inválido")
        res = await unirest('GET', URL('/'+tipo+'/asdiuohgwe'))
        if(resultado(res).status !== 400) 
            throw "O banco deve responder a uma busca de ID inválido com 400"
    }

    // insere despesa com data inválida. Resultado deve ser um erro 400.
    {
        print(`inserindo op com data inválida em ${tipo}`)
        res = await unirest('POST', URL('/'+tipo+''))
        .headers({
        'Content-Type': 'application/x-www-form-urlencoded'
        })
        .send({data : 20220933, descricao : "ifood", valor : 700, categoria : "Alimentação"})

        if(resultado(res).status !== 400)
            throw "O sistema não deve permitir inserção de transação com data inválida"
    }

    // insere despesa com parâmetros válidos. Resultado deve ser um JSON com os dados da transação.
    {
        print(`inserindo op válida em ${tipo}`)
        res = await unirest('POST', URL('/'+tipo+''))
        .headers({
        'Content-Type': 'application/x-www-form-urlencoded'
        })
        .send({data : 20220905, descricao : "ifood", valor : 700, categoria : "Alimentação"})

        if(res.status !== 201)
            throw "O sistema deveria responder com 201."
    }

    // testa remoção da despesa
    {
        r = resultado(res)
        print(r)        
            
        print(`apagando aquela op de ${tipo}`)
        res = await unirest('DELETE', URL('/'+tipo+'/'+r.id))
        
        print(resultado(res))

        await testa_vazio(tipo)
    }

    // testa inserção de despesa duplicada
    {
        print(`o banco deve proibir ${tipo} diplicadas`)
        res = await unirest('POST', URL('/'+tipo+''))
        .headers({
        'Content-Type': 'application/x-www-form-urlencoded'
        })
        .send({data : 20220905, descricao : "ifood", valor : 700, categoria : "Alimentação"})
            
        r = resultado(res)
        print(r)     

        print("reinserindo com os mesmos parâmetros.")
        res = await unirest('POST', URL('/'+tipo+''))
        .headers({
        'Content-Type': 'application/x-www-form-urlencoded'
        })
        .send({data : 20220905, descricao : "ifood", valor : 700, categoria : "Alimentação"})  

        if(res.status !== 400)
            throw "A inserção deveria ter falhado"

        print(res.raw_body)

        print(`removendo op de ${tipo}`)
        res = await unirest('DELETE', )    
    }
    // alteração para outro mês
    {
        print(`trocando aquela op para outro mes`)
        res = await unirest('PUT',URL('/'+tipo+'/'+r.id))
        .headers({
            'Content-Type': 'application/x-www-form-urlencoded'
        })
        .send({data : 20220405, descricao : "ifood", valor : 700, categoria : "Alimentação"})

        if(res.status !== 200)
            throw "Falha em atualizar despesa existente"    
    }

    r = resultado(res)
    let antigo = r.anterior,
        novo   = r.id

    // buscando a operação antiga
    {
        print("Buscando o antigo id da op alterada: "+antigo)
        res = await unirest('GET', URL('/'+tipo+'/'+antigo))
        print(res.raw_body)
        if(res.status !== 400) 
            throw "O status deveria ter sido 400."
    }        
    // buscando a operação nova
    {
        print("Buscando o novo id da op atualizada.")
        res = await unirest('GET', URL('/'+tipo+'/'+novo))
        if(res.status !== 200) 
            throw "O status deveria ter sido 200."

        r = resultado(res)
        print(r)
        if(!r.id)
            throw "O negócio veio sem id"
        if(!r.descricao)
            throw "O negócio veio sem descrição"
        if(!r.valor)
            throw "O negócio veio sem valor"
        if(isNaN( parseFloat(r.valor) ))
            throw "O valor é NaN"
        if(!parseInt(r.data))
            throw "A data é veio inválida"
    }        

    {
        print(`removendo.`)
        res = await unirest('DELETE', URL('/'+tipo+'/'+r.id))
        print(resultado(res))
        
        await testa_vazio(tipo)
    }

    // insere 60 despesas aleatórias
    let sucessos = 0,
        falhas   = 0,
        i = 0,
        num = 600
    for(i = 0; i < num; i++){
        print(`${i} / ${num} inserindo op aleatória em ${tipo}`)
        res = await unirest('POST', URL('/'+tipo+''))
        .headers({
        'Content-Type': 'application/x-www-form-urlencoded'
        })
        .send(inventaDespesa())
        if(res.status == 201){
            sucessos ++
        }
        else{
            falhas ++
            print(res.raw_body) 
        }
    }
    print (`${sucessos}/${falhas} entraram. Buscando ingredientes.`)
    for(i = 0; i < 60; i++){
        let ingrediente = ingredientes[ rnd(0,ingredientes.length)]
        print(`procurando ${ingrediente}`)
        res = await unirest('GET', URL('/'+tipo+'/?descricao='+ingrediente))

        if(res.status !== 200)
            throw "busca sempre deve retornar 200"
        r = resultado(res)
        print(`${r.length} ocorrencias`)
    }

    print("gerando resumos mês a mês de 2014 a 2022")
    let ano, mes
    for(ano = 2014; ano <= 2022; ano++){
        for(mes = 1; mes <=12; mes++){
            print(`resumo de ${mes}/${ano}`)
            res = await unirest('GET', URL(`/resumo/${ano}/${mes}`))

            if(res.status !== 200)
                print(res.raw_body)
            else
                print(resultado(res))
        }
    }

    print("apagando tudo o que foi feito")
    {
        let removidos = 0
        print("banco agora deve estar bem cheio.")
        res = await unirest('GET', URL(`/${tipo}/`))
        r = resultado(res)
        print(`${r.length} operações no banco.`)
        for(i = 0; i < r.length; i++){
            let op = r[i]
            print(`${i}/${r.length} apagando ${op.id}`)
            res = await unirest('DELETE', URL('/'+tipo+'/'+op.id))
            if(res.status === 200)
                print(resultado(res))
            else{
                print(res.raw_body)
                throw "O status deveria ter sido 200."
            }
                
        }

    }    

    await testa_vazio(tipo)

    print("Se chegou até aqui, tudo deu certo.")

})().catch( e => {
    console.error("Teste falhou com sucesso!")
    console.log(e)
})




