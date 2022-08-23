import { DocumentSnapshot, QuerySnapshot, Transaction } from "firebase-admin/firestore"

const
    admin = require("firebase-admin"),
    fs = admin.firestore()
export const db = {
    /** Adiciona documento no caminho e retorna ID. */
    adiciona : async (caminho:string, objeto:any) => fs.collection(caminho).add(objeto),
    /** Cria documento no caminho com ID especificado. */
    cria : async (caminho:string, id:string, objeto:any) => fs.collection(caminho).doc(id).create(objeto),
    /** Apaga documento no caminho com o ID especificado. */
    apaga : async (caminho: string, id:string) => fs.collection(caminho).doc(id).delete({exists : true}),
    /** Lê documento especificado. */
    le : async (caminho:string, id:string) => {
        let record = await fs.collection(caminho).doc(id).get()
        if(record.exists)
            return { id : record.id, ...record.data()}
        else
            throw "Documento inexistente."
    },
    atualiza : async (caminho: string, id: string, objeto:any) => fs.collection(caminho).doc(id).update( objeto ),

    move : async (caminho: string, id_antigo:string, id_novo:string, objeto:any) =>{            
        await fs.runTransaction( async (t:Transaction) =>
                t.delete(fs.collection(caminho).doc(id_antigo) , {exists:true} ) 
                 .create(fs.collection(caminho).doc(id_novo), objeto)
        )  
    },

    busca : async (caminho: string, ...criterios: (any[])) => {
        let ref = fs.collection(caminho)
        criterios.forEach(criterio => ref = ref.where(...criterio) )

        let record: QuerySnapshot = await ref.get(),
            result: (FirebaseFirestore.DocumentData | undefined)[] = record.docs.map( (d:DocumentSnapshot) => ({ id : d.id, ...d.data()} ))

        return result
    }
    
}