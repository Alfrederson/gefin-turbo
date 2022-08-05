# gefin-turbo - Gestor Financeiro Turbo Pro 2006



API da última palavra em Gestão Financeira feito para o Challenge de Backend da Alura.

Para ver testar a versão ao vivo, teste:

challenge-backend-9254d.web.app


# Operações:

* onde op é "receitas" ou "despesas"
* dados devem ser enviados com o padrão application/x-www-form-urlencoded

## Criar

POST /op

data => data no formato YYYYMMDD

descricao => descrição curta do evento

valor => valor movimentado no evento

Retorno:

JSON contendo os seguintes dados:

```
{
    "msg": "Operação registrada.",
    "id": "id_da_operação"
}
```

## Listar

GET /op

Retorno:

Array de todos os eventos de receitas ou despesas em JSON, de acordo com o seguinte formato:

```
[
    {
        "data": "YYYY-MM-DD",
        "descricao": "descrição",
        "valor": 300,
        "id": "id_da_operação"
    }, ...
]
```
## Detalhar

GET /op/id_da_operação

Retorno:

Dados da operação de id id_da_transação em um JSON, de acordo com o seguinte formato:

```
{
    "id": "id_da_operação",
    "valor": 300,
    "data": "YYYY-MM-DD",
    "descricao": "descrição"
}
```
## Atualizar

PUT /op/id_da_operação

data => data no formato YYYYMMDD

descricao => descrição curta do evento

valor => valor movimentado no evento

Retorno:

Caso a operação seja bem sucedida, o retorno é equivalente ao de uma criação de registro novo.

Note que, caso o mês e/ou a descrição da operação sejam alterados, será retornado um ID novo.

```
{
    "msg": "Operação modificada.",
    "id": "id_da_operação"
}
``` 
## Excluir

DELETE /op/id_da_operação

Retorno:

```
{
    "msg": "Operação removida.",
    "id": "id_da_operação"
}
```
