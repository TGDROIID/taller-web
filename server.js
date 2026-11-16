const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static(path.join(__dirname)));

const uri = "mongodb://Tristan:tgdroiid@ac-cwxmnck-shard-00-00.7ozroal.mongodb.net:27017,ac-cwxmnck-shard-00-01.7ozroal.mongodb.net:27017,ac-cwxmnck-shard-00-02.7ozroal.mongodb.net:27017/?ssl=true&replicaSet=atlas-d5oorh-shard-0&authSource=admin";

let db;
const PORT = process.env.PORT || 3000;

MongoClient.connect(uri, { tlsInsecure: true })
    .then(async client => {
        db = client.db('taller_mecanico');
        console.log("¡Conectado exitosamente a MongoDB Atlas!");
        
        try {
            const countUsuarios = await db.collection('usuarios').countDocuments();
            if (countUsuarios === 0) {
                const hashedPassword = await bcrypt.hash("123", 10);
                await db.collection('usuarios').insertMany([
                    { usuario: "admin", password: hashedPassword, rol: "administrador", nombre: "Carlos (Admin)" },
                    { usuario: "mecanico1", password: hashedPassword, rol: "mecanico", nombre: "Pedro (Mecánico)" },
                    { usuario: "cliente1", password: hashedPassword, rol: "cliente", nombre: "Juan Pérez (Cliente)" }
                ]);
                console.log("Usuarios iniciales creados correctamente.");
            }
        } catch (e) {
            console.log("Aviso en usuarios:", e.message);
        }

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
        });
    })
    .catch(error => console.error("Error al conectar a MongoDB:", error));

// --- AUTENTICACIÓN ---
app.post('/api/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;
        const user = await db.collection('usuarios').findOne({ usuario });
        if (!user) return res.status(401).json({ exito: false, mensaje: "Usuario o contraseña incorrectos" });

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ exito: false, mensaje: "Usuario o contraseña incorrectos" });

        res.json({ exito: true, rol: user.rol, nombre: user.nombre, id: user._id, usuario: user.usuario });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error en el servidor" });
    }
});

// --- CAMBIAR CONTRASEÑA ---
app.put('/api/usuarios/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevaPassword } = req.body;
        if (!nuevaPassword) return res.status(400).json({ exito: false, mensaje: "La contraseña es requerida" });

        const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
        await db.collection('usuarios').updateOne({ _id: new ObjectId(id) }, { $set: { password: hashedPassword } });
        res.json({ exito: true, mensaje: "¡Contraseña actualizada con éxito!" });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al actualizar contraseña" });
    }
});

// --- RUTAS GET ---
app.get('/api/clientes', async (req, res) => { res.json(await db.collection('clientes').find().toArray()); });
app.get('/api/vehiculos', async (req, res) => { res.json(await db.collection('vehiculos').find().toArray()); });
app.get('/api/ordenes', async (req, res) => { res.json(await db.collection('ordenes_servicio').find().toArray()); });
app.get('/api/empleados', async (req, res) => { res.json(await db.collection('empleados').find().toArray()); });
app.get('/api/refacciones', async (req, res) => { res.json(await db.collection('refacciones').find().toArray()); });
app.get('/api/servicios', async (req, res) => { res.json(await db.collection('servicios').find().toArray()); });
app.get('/api/usuarios', async (req, res) => { res.json(await db.collection('usuarios').find({}, { projection: { password: 0 } }).toArray()); });

// --- RUTAS POST ---
app.post('/api/clientes', async (req, res) => {
    const r = await db.collection('clientes').insertOne({ ...req.body, fecha: new Date() });
    res.json({ exito: true, id: r.insertedId });
});
app.post('/api/vehiculos', async (req, res) => {
    const r = await db.collection('vehiculos').insertOne({ ...req.body, año: parseInt(req.body.año) || 2020 });
    res.json({ exito: true, id: r.insertedId });
});
app.post('/api/ordenes', async (req, res) => {
    const nuevaO = { ...req.body, estado: "recibido", mecanico_asignado: "Sin asignar", fecha: new Date() };
    const r = await db.collection('ordenes_servicio').insertOne(nuevaO);
    res.json({ exito: true, id: r.insertedId });
});
app.post('/api/empleados', async (req, res) => {
    const r = await db.collection('empleados').insertOne(req.body);
    res.json({ exito: true, id: r.insertedId });
});
app.post('/api/refacciones', async (req, res) => {
    const r = await db.collection('refacciones').insertOne(req.body);
    res.json({ exito: true, id: r.insertedId });
});
app.post('/api/servicios', async (req, res) => {
    const r = await db.collection('servicios').insertOne(req.body);
    res.json({ exito: true, id: r.insertedId });
});

// --- RUTAS PUT (ACTUALIZAR) ---
app.put('/api/clientes/:id', async (req, res) => {
    await db.collection('clientes').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ exito: true });
});
app.put('/api/vehiculos/:id', async (req, res) => {
    await db.collection('vehiculos').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ exito: true });
});
app.put('/api/empleados/:id', async (req, res) => {
    await db.collection('empleados').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ exito: true });
});
app.put('/api/ordenes/:id', async (req, res) => {
    await db.collection('ordenes_servicio').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ exito: true });
});
app.put('/api/refacciones/:id', async (req, res) => {
    await db.collection('refacciones').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ exito: true });
});

// --- RUTAS DELETE ---
app.delete('/api/clientes/:id', async (req, res) => { res.json({ exito: await db.collection('clientes').deleteOne({ _id: new ObjectId(req.params.id) }) }); });
app.delete('/api/vehiculos/:id', async (req, res) => { res.json({ exito: await db.collection('vehiculos').deleteOne({ _id: new ObjectId(req.params.id) }) }); });
app.delete('/api/empleados/:id', async (req, res) => { res.json({ exito: await db.collection('empleados').deleteOne({ _id: new ObjectId(req.params.id) }) }); });
app.delete('/api/refacciones/:id', async (req, res) => { res.json({ exito: await db.collection('refacciones').deleteOne({ _id: new ObjectId(req.params.id) }) }); });
app.delete('/api/ordenes/:id', async (req, res) => { res.json({ exito: await db.collection('ordenes_servicio').deleteOne({ _id: new ObjectId(req.params.id) }) }); });