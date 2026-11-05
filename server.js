const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt'); // Importamos bcrypt para la encriptación por hash

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static(path.join(__dirname)));

const uri = "mongodb://Tristan:tgdroiid@ac-cwxmnck-shard-00-00.7ozroal.mongodb.net:27017,ac-cwxmnck-shard-00-01.7ozroal.mongodb.net:27017,ac-cwxmnck-shard-00-02.7ozroal.mongodb.net:27017/?ssl=true&replicaSet=atlas-d5oorh-shard-0&authSource=admin";

let db;

// Definimos el puerto dinámico para la nube (Render) o 3000 por defecto para local
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
                console.log("Usuarios de prueba creados con seguridad Hash (bcrypt).");
            }
        } catch (e) {
            console.log("Aviso en usuarios:", e.message);
        }

        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
        });
    })
    .catch(error => console.error("Error al conectar a MongoDB:", error));

// --- AUTENTICACIÓN SEGURA CON HASH (BCRYPT) ---
app.post('/api/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;
        
        const user = await db.collection('usuarios').findOne({ usuario });
        if (!user) {
            return res.status(401).json({ exito: false, mensaje: "Usuario o contraseña incorrectos" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ exito: false, mensaje: "Usuario o contraseña incorrectos" });
        }

        res.json({ exito: true, rol: user.rol, nombre: user.nombre, id: user._id });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ exito: false, mensaje: "Error en el servidor" });
    }
});

// --- RUTA PARA CAMBIAR CONTRASEÑA DE USUARIO (LOGIN) ---
app.put('/api/usuarios/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevaPassword } = req.body;
        if (!nuevaPassword) {
            return res.status(400).json({ exito: false, mensaje: "La nueva contraseña es requerida" });
        }

        const hashedPassword = await bcrypt.hash(nuevaPassword, 10);
        await db.collection('usuarios').updateOne(
            { _id: new ObjectId(id) },
            { $set: { password: hashedPassword } }
        );
        res.json({ exito: true, mensaje: "¡Contraseña de acceso actualizada con éxito!" });
    } catch (error) {
        console.error("Error al actualizar contraseña:", error);
        res.status(500).json({ exito: false, mensaje: "Error al actualizar la contraseña" });
    }
});

// --- RUTAS GET (CONSULTAS) ---
app.get('/api/clientes', async (req, res) => {
    try { res.json(await db.collection('clientes').find().toArray()); } 
    catch (error) { res.status(500).json({ error: "Error al obtener clientes" }); }
});

app.get('/api/vehiculos', async (req, res) => {
    try { res.json(await db.collection('vehiculos').find().toArray()); } 
    catch (error) { res.status(500).json({ error: "Error al obtener vehículos" }); }
});

app.get('/api/ordenes', async (req, res) => {
    try { res.json(await db.collection('ordenes_servicio').find().toArray()); } 
    catch (error) { res.status(500).json({ error: "Error al obtener órdenes de servicio" }); }
});

app.get('/api/empleados', async (req, res) => {
    try { res.json(await db.collection('empleados').find().toArray()); } 
    catch (error) { res.status(500).json({ error: "Error al obtener empleados" }); }
});

app.get('/api/refacciones', async (req, res) => {
    try { res.json(await db.collection('refacciones').find().toArray()); } 
    catch (error) { res.status(500).json({ error: "Error al obtener refacciones" }); }
});

app.get('/api/servicios', async (req, res) => {
    try { res.json(await db.collection('servicios').find().toArray()); } 
    catch (error) { res.status(500).json({ error: "Error al obtener servicios" }); }
});

app.get('/api/usuarios', async (req, res) => {
    try { res.json(await db.collection('usuarios').find({}, { projection: { password: 0 } }).toArray()); } 
    catch (error) { res.status(500).json({ error: "Error al obtener usuarios" }); }
});

// --- RUTAS POST (REGISTRO) ---
app.post('/api/clientes', async (req, res) => {
    try {
        const nuevoCliente = { ...req.body, activo: true, fecha_registro: new Date() };
        const resultado = await db.collection('clientes').insertOne(nuevoCliente);
        res.json({ exito: true, mensaje: "Cliente registrado con éxito", id: resultado.insertedId });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al registrar el cliente" }); }
});

app.post('/api/vehiculos', async (req, res) => {
    try {
        const { marca, modelo, año, placas, placa, cliente_id } = req.body;
        const anioInt = parseInt(año, 10) || 2020;
        const valorPlaca = placa || placas || "S/N";
        let idClienteObj = cliente_id && ObjectId.isValid(cliente_id) ? new ObjectId(cliente_id) : null;

        const nuevoVehiculo = {
            marca: String(marca), modelo: String(modelo), anio: anioInt, año: anioInt,
            placa: String(valorPlaca), placas: String(valorPlaca), cliente_id: idClienteObj,
            activo: true, fecha_registro: new Date()
        };
        const resultado = await db.collection('vehiculos').insertOne(nuevoVehiculo);
        res.json({ exito: true, mensaje: "Vehículo registrado con éxito", id: resultado.insertedId });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al registrar el vehículo" }); }
});

app.post('/api/ordenes', async (req, res) => {
    try {
        const { folio, descripcion, estado, vehiculo_id, mecanico_asignado } = req.body;
        let idVehiculoObj = vehiculo_id && ObjectId.isValid(vehiculo_id) ? new ObjectId(vehiculo_id) : null;

        const nuevaOrden = {
            folio: String(folio), descripcion: String(descripcion || ""),
            estado: estado || "recibido", mecanico_asignado: String(mecanico_asignado || "Sin asignar"),
            vehiculo_id: idVehiculoObj, fecha_ingreso: new Date(), activo: true, fecha_registro: new Date()
        };
        const resultado = await db.collection('ordenes_servicio').insertOne(nuevaOrden);
        res.json({ exito: true, mensaje: "Orden creada con éxito", id: resultado.insertedId });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al registrar la orden" }); }
});

app.post('/api/empleados', async (req, res) => {
    try {
        const nuevoEmpleado = { ...req.body, activo: true, fecha_registro: new Date() };
        const resultado = await db.collection('empleados').insertOne(nuevoEmpleado);
        res.json({ exito: true, mensaje: "Empleado registrado con éxito", id: resultado.insertedId });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al registrar empleado" }); }
});

app.post('/api/refacciones', async (req, res) => {
    try {
        const nuevaRefaccion = { ...req.body, activo: true, fecha_registro: new Date() };
        const resultado = await db.collection('refacciones').insertOne(nuevaRefaccion);
        res.json({ exito: true, mensaje: "Refacción registrada con éxito", id: resultado.insertedId });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al registrar refacción" }); }
});

app.post('/api/servicios', async (req, res) => {
    try {
        const nuevoServicio = { ...req.body, activo: true, fecha_registro: new Date() };
        const resultado = await db.collection('servicios').insertOne(nuevoServicio);
        res.json({ exito: true, mensaje: "Servicio registrado con éxito", id: resultado.insertedId });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al registrar servicio" }); }
});

// --- RUTAS PUT (ACTUALIZAR) ---
app.put('/api/clientes/:id', async (req, res) => {
    try {
        await db.collection('clientes').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
        res.json({ exito: true, mensaje: "Cliente actualizado con éxito" });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al actualizar cliente" }); }
});

app.put('/api/vehiculos/:id', async (req, res) => {
    try {
        await db.collection('vehiculos').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
        res.json({ exito: true, mensaje: "Vehículo actualizado con éxito" });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al actualizar vehículo" }); }
});

app.put('/api/empleados/:id', async (req, res) => {
    try {
        await db.collection('empleados').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
        res.json({ exito: true, mensaje: "Empleado actualizado con éxito" });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al actualizar empleado" }); }
});

app.put('/api/ordenes/:id', async (req, res) => {
    try {
        await db.collection('ordenes_servicio').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
        res.json({ exito: true, mensaje: "Orden actualizada con éxito" });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al actualizar orden" }); }
});

app.put('/api/refacciones/:id', async (req, res) => {
    try {
        await db.collection('refacciones').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
        res.json({ exito: true, mensaje: "Refacción actualizada con éxito" });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al actualizar refacción" }); }
});

app.put('/api/servicios/:id', async (req, res) => {
    try {
        await db.collection('servicios').updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
        res.json({ exito: true, mensaje: "Servicio actualizado con éxito" });
    } catch (error) { res.status(500).json({ exito: false, mensaje: "Error al actualizar servicio" }); }
});

// --- RUTAS DELETE (ELIMINAR) ---
app.delete('/api/clientes/:id', async (req, res) => {
    try { await db.collection('clientes').deleteOne({ _id: new ObjectId(req.params.id) }); res.json({ exito: true }); }
    catch (e) { res.status(500).json({ exito: false }); }
});

app.delete('/api/vehiculos/:id', async (req, res) => {
    try { await db.collection('vehiculos').deleteOne({ _id: new ObjectId(req.params.id) }); res.json({ exito: true }); }
    catch (e) { res.status(500).json({ exito: false }); }
});

app.delete('/api/empleados/:id', async (req, res) => {
    try { await db.collection('empleados').deleteOne({ _id: new ObjectId(req.params.id) }); res.json({ exito: true }); }
    catch (e) { res.status(500).json({ exito: false }); }
});

app.delete('/api/refacciones/:id', async (req, res) => {
    try { await db.collection('refacciones').deleteOne({ _id: new ObjectId(req.params.id) }); res.json({ exito: true }); }
    catch (e) { res.status(500).json({ exito: false }); }
});

app.delete('/api/servicios/:id', async (req, res) => {
    try { await db.collection('servicios').deleteOne({ _id: new ObjectId(req.params.id) }); res.json({ exito: true }); }
    catch (e) { res.status(500).json({ exito: false }); }
});

app.delete('/api/ordenes/:id', async (req, res) => {
    try { await db.collection('ordenes_servicio').deleteOne({ _id: new ObjectId(req.params.id) }); res.json({ exito: true }); }
    catch (e) { res.status(500).json({ exito: false }); }
});