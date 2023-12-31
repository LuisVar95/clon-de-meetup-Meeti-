const { validationResult } = require('express-validator');
const Categorias = require('../models/Categorias');
const Grupos = require('../models/Grupos');

const multer = require('multer');
const shortid = require('shortid');
const fs = require('fs');

const configuracionMulter = {
    limits : { filesize : 100000},
    storage: fileStorage = multer.diskStorage({
        destination: (req, file, next) => {
            next(null, __dirname+'/../public/uploads/grupos/')
        },
        filename : (req, file, next) => {
            const extension = file.mimetype.split('/')[1];
            next(null, `${shortid.generate()}.${extension}`);
        }
    }),
    fileFilter(req, file, next){
        if(file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
            // el formato es valido
            next(null, true);
        } else {
            // el formato no es valido
            next(new Error('Formato no valido'), false);
        }
    }
}

const upload = multer(configuracionMulter).single('imagen');

// sube imagen en el servidor
exports.subirImagen = (req, res, next) => {
    upload(req, res, function(error) {
        if(error) {
            if(error instanceof multer.MulterError){
                if(error.code === 'LIMIT_FILE_SIZE'){
                    req.flash('error', 'El Archivo es muy grande');
                } else {
                    req.flash('error', error.message);
                }
            } else if(error.hasOwnProperty('message')){
                req.flash('error', error.message);
            }
            res.redirect('back')
            return;
        } else {
            next();
        }
    })
}

exports.formNuevoGrupo = async (req, res) => {
    const categorias = await Categorias.findAll();

    res.render('nuevo-grupo', {
        nombrePagina : 'Crea un nuevo grupo',
        categorias
    })
}

// Almacena los grupos en la BD
exports.crearGrupo = async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const errorMessages = errors.array().map(error => error.msg);
        req.flash('error', errorMessages)
        return res.redirect('/nuevo-grupo')
    }

    const grupo = {
        nombre: req.body.nombre,
        url: req.body.url,
        descripcion: req.body.descripcion,
        categoriaId: req.body.categoriaId
    }

    // almacena el usuario autenticado como el creador del grupo
    grupo.usuarioId = req.user.id;

    // leer la imagen
    if(req.file){
        grupo.imagen = req.file.filename;
    }
    

    try {
        // almacenar en la BD
        await Grupos.create(grupo);
        req.flash('exito', 'Se ha creado el Grupo Correctamente');
        res.redirect('/administracion');
    } catch (error) {
        // extraer el message de los errores
        const erroresSequelize = error.errors.map(err => err.message);

        req.flash('error', erroresSequelize);
        res.redirect('/nuevo-grupo');
    }
}

exports.formEditarGrupo = async (req, res) => {
    const consultas = [];
    consultas.push( Grupos.findByPk(req.params.grupoId));
    consultas.push( Categorias.findAll());

    // Promise
    const [grupo, categorias] = await Promise.all(consultas);

    res.render('editar-grupo', {
        nombrePagina : `Editar Grupo : ${grupo.nombre}`,
        grupo,
        categorias
    })
}

exports.editarGrupo = async (req, res, next) => {
    const grupo = await Grupos.findOne({ where : { id : req.params.grupoId, usuarioId : req.user.id}});

    // si no existe ese grupo o no es el dueno
    if(!grupo) {
        req.flash('error', 'Opreacion no valida');
        res.redirect('/administracion');
        return next();
    }

    // todo bien, leer los valores
    const { nombre, descripcion, categoriaId, url} = req.body;

    // asignar los valores
    grupo.nombre = nombre;
    grupo.descripcion = descripcion;
    grupo.categoriaId = categoriaId;
    grupo.url = url;

    // guardamos en la base de datos
    await grupo.save();
    req.flash('exito', 'Cambios Almacenado Coorrectamente');
    res.redirect('/administracion')

}

exports.formEditarImagen = async (req, res) => {
    const grupo = await Grupos.findByPk(req.params.grupoId);

    res.render('imagen-grupo', {
        nombrePagina : `Editar Imagen Grupo : ${grupo.nombre}`,
        grupo
    })
}

// Modifica la imagen en la BD y elimina la anterior
exports.editarImagen = async (req, res, next) => {
    const grupo = await Grupos.findOne({ where : { id : req.params.grupoId, usuarioId : req.user.id}});

    // el grupo existe y es valido
    if(!grupo){
        req.flash('error', 'Operacion no valida');
        res.redirect('/iniciar-sesion');
        return next();
    }

    //  Verificar que el archivo sea nuevo
    //  if(req.file) {
    //      console.log(req.file.filename);
    //  }

    //  revisar que exista un archivo anterior
    //  if(grupo.imagen) {
    //      console.log(grupo.imagen);
    //  }

    // Si hay imagen anterior y nueva, significa que vamos a borrar la anterior
    if(req.file && grupo.imagen){
        const imagenAnteriorPath = __dirname + `/../public/uploads/grupos/${grupo.imagen}`;

        // eliminar archivo con filesystem
        fs.unlink(imagenAnteriorPath, (error) => {
            if(error){
                console.log(error)
            }
            return;
        })
    }

    // Si hay una imagen nueva, lo guardamos
    if(req.file){
        grupo.imagen = req.file.filename
    }

    // guardar en la BD
    await grupo.save();
    req.flash('exito', 'Cambios Almacenados Correctamente');
    res.redirect('/administracion');

}

exports.formEliminarGrupo = async (req, res, next) => {
    const grupo = await Grupos.findOne({ where : { id : req.params.grupoId, usuarioId : req.user.id}});

    if(!grupo){
        req.flash('error', 'Oprecion no valida');
        res.redirect('/administracion')
        return next();
    }

    // todo bien, ejecutar la vista
    res.render('eliminar-grupo', {
        nombrePagina : `Eliminar Grupo : ${grupo.nombre}`
    })
}

exports.eliminarGrupo = async (req, res, next) => {
    const grupo = await Grupos.findOne({ where : { id : req.params.grupoId, usuarioId : req.user.id}});

    if(!grupo){
        req.flash('error', 'Oprecion no valida');
        res.redirect('/administracion')
        return next();
    }

    // Si hay una imagen, eliminarla
    if(grupo.imagen){
        const imagenAnteriorPath = __dirname + `/../public/uploads/grupos/${grupo.imagen}`;
        
        // eliminar archivo con filesystem
        fs.unlink(imagenAnteriorPath, (error) => {
            if(error){
                console.log(error)
            }
            return;
        })
    }

    // Eliminar el grupo
    await Grupos.destroy({
        where: {
            id: req.params.grupoId
        }
    });

    // Redireccionar al usuario
    req.flash('exito', 'Grupo Eliminado');
    res.redirect('/administracion')

}