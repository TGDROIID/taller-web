const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static(path.join(__dirname)));

const uri = "mongodb://Tristan:tgdroiid@ac-cwxmnck-shard-00-00.7ozroal.mongodb.net:27017,ac-cwxmnck-shard-00-01.7ozroal.mongodb.net:27017,ac-cwxmnck-shard-00-02.7ozroal.mongodb.net:27017/?ssl=true&replicaSet=atlas-d5oorh-shard-0&authSource=admin";

let db;

MongoClient.connect(uri, { tlsInsecure: true })
    .then(async client => {
        db = client.db('taller_mecanico');
        console.log("¡Conectado exitosamente a MongoDB Atlas (Ejemplo1)!");
        
        // Crear usuarios de prueba si la colección 'usuarios' está vacía
        const countUsuarios = await db.collection('usuarios').countDocuments();
        if (countUsuarios === 0) {
            await db.collection('usuarios').insertMany([
                { usuario: "admin", password: "123", rol: "administrador", nombre: "Carlos (Admin)" },
                { usuario: "mecanico1", password: "123", rol: "mecanico", nombre: "Pedro (Mecánico)" },
                { usuario: "cliente1", password: "123", rol: "cliente", nombre: "Juan Pérez (Cliente)" }
            ]);
            console.log("Usuarios de prueba creados.");
        }

        app.listen(3000, () => {
            console.log("Servidor corriendo en http://localhost:3000");
        });
    })
    .catch(error => console.error("Error al conectar a MongoDB:", error));

// Ruta de Autenticación (Login)
app.post('/api/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;
        const user = await db.collection('usuarios').findOne({ usuario, password });
        
        if (!user) {
            return res.status(401).json({ exito: false, mensaje: "Usuario o contraseña incorrectos" });
        }
        
        res.json({ exito: true, rol: user.rol, nombre: user.nombre });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error en el servidor" });
    }
});

// Rutas de datos
app.get('/api/clientes', async (req, res) => {
    try {
        const clientes = await db.collection('clientes').find().toArray();
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener clientes" });
    }
});

app.get('/api/vehiculos', async (req, res) => {
    try {
        const vehiculos = await db.collection('vehiculos').find().toArray();
        res.json(vehiculos);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener vehículos" });
    }
});

app.get('/api/ordenes', async (req, res) => {
    try {
        const ordenes = await db.collection('ordenes_servicio').find().toArray();
        res.json(ordenes);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener órdenes de servicio" });
    }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const nuevoCliente = req.body;
        const resultado = await db.collection('clientes').insertOne(nuevoCliente);
        res.json({ mensaje: "Cliente registrado con éxito", id: resultado.insertedId });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar el cliente" });
    }
});