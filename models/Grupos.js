const Sequelize = require('sequelize');
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const Categorias = require('./Categorias');
const Usuarios = require('./Usuarios')

const Grupos = db.define('grupos', {
    id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: uuidv4()
    },
    nombre: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'El grupo debe tener un nombre'
            }
        }
    },
    descripcion: {
        type: Sequelize.STRING(300),
        allowNull: false,
        validate : {
            notEmpty: {
                msg: 'Coloca una descripcion'
            }
        }
    },
    url: {
        type: Sequelize.STRING,
        allowNull: true,
    },
    imagen: {
        type: Sequelize.STRING,
        allowNull: true,
    }
})

Grupos.belongsTo(Categorias);
Grupos.belongsTo(Usuarios);

module.exports = Grupos;