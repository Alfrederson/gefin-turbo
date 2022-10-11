import * as functions from "firebase-functions"
const admin = require("firebase-admin")
admin.initializeApp()

import { Operacoes } from "./operacoes"
import { Conta } from "./conta"

const  
    express = require("express"),
    app = express(),
    cors = require("cors"),
    corsOptions = {
        credentials: true,
        origin: true
    }

app.use(cors(corsOptions))
// ativa o sistema de operações usando o app.
Operacoes.usa(app)
Conta.usa(app)
// ativa o sistema de login usando app.

// A aplicação tem a arquitetura de lambdalito, mas a gente poderia
// registrar outras funções diferentes para responder a categorias
// de requisições diferentes.
exports.app = functions.https.onRequest(app)
