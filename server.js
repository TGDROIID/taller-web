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
        console.log("¡Conectado exitosamente a MongoDB Atlas (Ejemplo1)!");
        
        try {
            const countUsuarios = await db.collection('usuarios').countDocuments();
            if (countUsuarios === 0) {
                // Generamos un hash seguro para la contraseña por defecto "123"
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
        
        // Buscamos al usuario por su nombre de usuario
        const user = await db.collection('usuarios').findOne({ usuario });
        if (!user) {
            return res.status(401).json({ exito: false, mensaje: "Usuario o contraseña incorrectos" });
        }

        // Comparamos la contraseña ingresada con el hash almacenado en la BD
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ exito: false, mensaje: "Usuario o contraseña incorrectos" });
        }

        res.json({ exito: true, rol: user.rol, nombre: user.nombre });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ exito: false, mensaje: "Error en el servidor" });
    }
});

// --- RUTAS GET (CONSULTAS) ---
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

app.get('/api/empleados', async (req, res) => {
    try {
        const empleados = await db.collection('empleados').find().toArray();
        res.json(empleados);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener empleados" });
    }
});

app.get('/api/refacciones', async (req, res) => {
    try {
        const refacciones = await db.collection('refacciones').find().toArray();
        res.json(refacciones);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener refacciones" });
    }
});

app.get('/api/servicios', async (req, res) => {
    try {
        const servicios = await db.collection('servicios').find().toArray();
        res.json(servicios);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener servicios" });
    }
});

// --- RUTAS POST (REGISTRO) ---
app.post('/api/clientes', async (req, res) => {
    try {
        const { nombre, apellidos, telefono, correo } = req.body;
        const nuevoCliente = { nombre, apellidos, telefono, correo, activo: true, fecha_registro: new Date() };
        const resultado = await db.collection('clientes').insertOne(nuevoCliente);
        res.json({ exito: true, mensaje: "Cliente registrado con éxito", id: resultado.insertedId });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al registrar el cliente" });
    }
});

app.post('/api/vehiculos', async (req, res) => {
    try {
        const { marca, modelo, año, placas, placa, cliente_id } = req.body;
        const anioInt = parseInt(año, 10) || 2020;
        const valorPlaca = placa || placas || "S/N";

        let idClienteObj;
        if (cliente_id && ObjectId.isValid(cliente_id)) {
            idClienteObj = new ObjectId(cliente_id);
        } else {
            const primerCliente = await db.collection('clientes').findOne({});
            idClienteObj = primerCliente ? primerCliente._id : new ObjectId();
        }

        const nuevoVehiculo = {
            marca: String(marca),
            modelo: String(modelo),
            anio: anioInt,
            año: anioInt,
            placa: String(valorPlaca),
            placas: String(valorPlaca),
            cliente_id: idClienteObj,
            activo: true,
            fecha_registro: new Date()
        };

        const resultado = await db.collection('vehiculos').insertOne(nuevoVehiculo);
        res.json({ exito: true, mensaje: "Vehículo registrado con éxito", id: resultado.insertedId });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al registrar el vehículo" });
    }
});

app.post('/api/ordenes', async (req, res) => {
    try {
        const { folio, descripcion, estado, vehiculo_id } = req.body;
        let estadoLower = (estado || "Pendiente").toLowerCase();
        const mapaEstados = {
            "pendiente": "recibido",
            "en proceso": "en_reparacion",
            "finalizado": "terminado",
            "recibido": "recibido",
            "diagnostico": "diagnostico",
            "en_reparacion": "en_reparacion",
            "esperando_refaccion": "esperando_refaccion",
            "terminado": "terminado",
            "entregado": "entregado",
            "cancelado": "cancelado"
        };
        const estadoFinal = mapaEstados[estadoLower] || "recibido";

        let idVehiculoObj = null;
        let idClienteObj = null;

        if (vehiculo_id && ObjectId.isValid(vehiculo_id)) {
            idVehiculoObj = new ObjectId(vehiculo_id);
            const vehiculoDoc = await db.collection('vehiculos').findOne({ _id: idVehiculoObj });
            if (vehiculoDoc && vehiculoDoc.cliente_id) idClienteObj = vehiculoDoc.cliente_id;
        }

        if (!idClienteObj) {
            const primerCliente = await db.collection('clientes').findOne({});
            idClienteObj = primerCliente ? primerCliente._id : new ObjectId();
        }

        const nuevaOrden = {
            folio: String(folio),
            descripcion: String(descripcion || ""),
            estado: estadoFinal,
            vehiculo_id: idVehiculoObj || new ObjectId(),
            cliente_id: idClienteObj,
            fecha_ingreso: new Date(),
            activo: true,
            fecha_registro: new Date()
        };

        const resultado = await db.collection('ordenes_servicio').insertOne(nuevaOrden);
        res.json({ exito: true, mensaje: "Orden creada con éxito", id: resultado.insertedId });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al registrar la orden" });
    }
});

app.post('/api/empleados', async (req, res) => {
    try {
        const { nombre, puesto, telefono } = req.body;
        const partes = (nombre || "").trim().split(" ");
        const primerNombre = partes[0] || "";
        const apellidos = partes.slice(1).join(" ") || "N/A";

        let puestoLower = (puesto || "mecanico").toLowerCase();
        const mapaPuestos = {
            "mecanico": "mecanico",
            "recepcion": "recepcion",
            "gerente": "gerente",
            "refacciones": "refacciones"
        };
        const puestoFinal = mapaPuestos[puestoLower] || "mecanico";

        const nuevoEmpleado = {
            nombre: String(primerNombre),
            apellidos: String(apellidos),
            nombre_completo: String(nombre),
            puesto: puestoFinal,
            telefono: String(telefono || ""),
            activo: true,
            fecha_registro: new Date()
        };

        const resultado = await db.collection('empleados').insertOne(nuevoEmpleado);
        res.json({ exito: true, mensaje: "Empleado registrado con éxito", id: resultado.insertedId });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al registrar el empleado en la base de datos" });
    }
});

app.post('/api/refacciones', async (req, res) => {
    try {
        const { nombre, precio, costo, stock, cantidad, sku } = req.body;
        const precioNum = parseFloat(precio || costo) || 0;
        const stockNum = parseInt(stock || cantidad, 10) || 0;
        const skuGenerado = sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`;

        const nuevaRefaccion = {
            sku: String(skuGenerado),
            nombre: String(nombre || ""),
            precio_venta: precioNum,
            precio: precioNum,
            costo: precioNum,
            stock: stockNum,
            cantidad: stockNum,
            activo: true,
            fecha_registro: new Date()
        };

        const resultado = await db.collection('refacciones').insertOne(nuevaRefaccion);
        res.json({ exito: true, mensaje: "Refacción registrada con éxito", id: resultado.insertedId });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al registrar la refacción en la base de datos" });
    }
});

app.post('/api/servicios', async (req, res) => {
    try {
        const { nombre, costo, precio, descripcion, codigo, categoria } = req.body;
        const costoNum = parseFloat(costo || precio) || 0;
        const codigoGenerado = codigo || `SERV-${Math.floor(100000 + Math.random() * 900000)}`;
        const categoriaFinal = categoria || "mantenimiento";

        const nuevoServicio = {
            codigo: String(codigoGenerado),
            nombre: String(nombre || ""),
            precio_base: costoNum,
            categoria: String(categoriaFinal),
            costo: costoNum,
            precio: costoNum,
            descripcion: String(descripcion || ""),
            activo: true,
            fecha_registro: new Date()
        };

        const resultado = await db.collection('servicios').insertOne(nuevoServicio);
        res.json({ exito: true, mensaje: "Servicio registrado con éxito", id: resultado.insertedId });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al registrar el servicio en la base de datos" });
    }
});

// --- RUTAS PUT (ACTUALIZAR / EDITAR) ---
app.put('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellidos, telefono, correo } = req.body;
        await db.collection('clientes').updateOne(
            { _id: new ObjectId(id) },
            { $set: { nombre, apellidos, telefono, correo } }
        );
        res.json({ exito: true, mensaje: "Cliente actualizado con éxito" });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al actualizar el cliente" });
    }
});

app.put('/api/refacciones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, precio, stock } = req.body;
        const precioNum = parseFloat(precio) || 0;
        const stockNum = parseInt(stock, 10) || 0;
        await db.collection('refacciones').updateOne(
            { _id: new ObjectId(id) },
            { $set: { nombre, precio_venta: precioNum, precio: precioNum, costo: precioNum, stock: stockNum, cantidad: stockNum } }
        );
        res.json({ exito: true, mensaje: "Refacción actualizada con éxito" });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al actualizar la refacción" });
    }
});

app.put('/api/servicios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, costo, descripcion } = req.body;
        const costoNum = parseFloat(costo) || 0;
        await db.collection('servicios').updateOne(
            { _id: new ObjectId(id) },
            { $set: { nombre, precio_base: costoNum, costo: costoNum, precio: costoNum, descripcion } }
        );
        res.json({ exito: true, mensaje: "Servicio actualizado con éxito" });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al actualizar el servicio" });
    }
});

// --- RUTAS DELETE (ELIMINAR) ---
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('clientes').deleteOne({ _id: new ObjectId(id) });
        res.json({ exito: true, mensaje: "Cliente eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al eliminar el cliente" });
    }
});

app.delete('/api/vehiculos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('vehiculos').deleteOne({ _id: new ObjectId(id) });
        res.json({ exito: true, mensaje: "Vehículo eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al eliminar el vehículo" });
    }
});

app.delete('/api/empleados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('empleados').deleteOne({ _id: new ObjectId(id) });
        res.json({ exito: true, mensaje: "Empleado eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al eliminar el empleado" });
    }
});

app.delete('/api/refacciones/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('refacciones').deleteOne({ _id: new ObjectId(id) });
        res.json({ exito: true, mensaje: "Refacción eliminada con éxito" });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al eliminar la refacción" });
    }
});

app.delete('/api/servicios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('servicios').deleteOne({ _id: new ObjectId(id) });
        res.json({ exito: true, mensaje: "Servicio eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al eliminar el servicio" });
    }
});

app.delete('/api/ordenes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('ordenes_servicio').deleteOne({ _id: new ObjectId(id) });
        res.json({ exito: true, mensaje: "Orden eliminada con éxito" });
    } catch (error) {
        res.status(500).json({ exito: false, mensaje: "Error al eliminar la orden" });
    }
});