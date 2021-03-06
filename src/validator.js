import {Datatypes} from './datatypes'
import {isArrayOf, isObject, isNumber, isString, isMandatory, getJSONKey} from './utils'

export function validateJSON(key, json, schema) {
    if (!schema)
        throw `Error in \'${key}\' -> Schema not defined`
    if (key === '___root' && typeof json !== 'object')
        throw "JSON root must be an object"
    if (key === '___root' && Array.isArray(json))
        throw "JSON root must not be an array"

    let config = getFieldConfig(key, schema)
    verifyJSONDatatype(json, config.datatype, key)

    if (config.datatype === Datatypes.string || config.datatype === Datatypes.number) {
        return true
    }

    try {
        if (config.datatype === Datatypes.array) {
            validateArray(json, config)
        } else {
            validateObject(json, config, schema)
        }
    } catch (exception) {
        throw `Error in \'${key}\' -> ${exception.message || exception}`
    }

    return true
}

function verifyJSONDatatype(json, datatype, key){
    if ((datatype === Datatypes.array && !Array.isArray(json))
        || (datatype !== Datatypes.array && typeof json !== datatype)) {
        throw `Expected an ${datatype} against \'${key}\'`
    }
}

function validateArray(json, config){
    let lastIndex = 0
    if (config.isSimpleArray) {
        let isValid = json.every((child, index) => {
            lastIndex = index
            return typeof child === config.isArrayOfSchema
        })

        if (!isValid)
            throw `Error at index \'${lastIndex}\'. Array must contain data of type \'${config.isArrayOf}\'`
    } else {
        json.every((child, index) => {
            lastIndex = index
            try {
                validateJSON('__array', child, config.isArrayOfSchema)
            } catch (exception) {
                throw `Error at index \'${lastIndex}\' -> ${exception.message || exception}`
            }
        })
    }
}

function validateObject(json, config, schema){
    let mandatoryItems = config.mandatoryChildren
      , lastChecked = null
      , isValid = !mandatoryItems || mandatoryItems.every(child => {
          lastChecked = child = child.substr(0, child.length - 1)
          return typeof json[child] !== 'undefined'
      })

    if (!isValid)
        throw `Mandatory field \'${lastChecked}\' not found`

    Object.keys(json).every(
        child => validateJSON(child, json[child], schema[child] || schema[child + '!'])
    )
}

function getFieldConfig(key, dataTypeSchema) {
    let datatype = getDataType(dataTypeSchema)
      , isArrayOfSchema = isArrayOf(dataTypeSchema)
      , { array, object, ...primitivaDataTypes } = Datatypes
      , isPrimitiveDataType = typeof primitivaDataTypes[datatype] !== 'undefined'
      , config = {
          key: getJSONKey(key),
          mandatory: isMandatory(key),
          datatype: datatype,
          isArrayOfSchema: isArrayOfSchema,
          isSimpleArray: isArrayOfSchema !== null && typeof primitivaDataTypes[isArrayOfSchema] !== 'undefined'
      }
      , children = null;

    if (!isPrimitiveDataType) {
        let childObject = (datatype === object && dataTypeSchema)
            || (!config.isSimpleArray && isArrayOfSchema) || null

        children = childObject && Object.keys(childObject).filter(field => field.substr(-10) !== '__template')
    }

    config = {
        ...config,
        children,
        mandatoryChildren: children && children.filter(child => child.substr(-1) === '!')
    }
      
    return config
}

function getDataType(dataTypeSchema){
    if (isString(dataTypeSchema)) {
        return Datatypes.string
    } else if (isNumber(dataTypeSchema)) {
        return Datatypes.number
    } else if (isObject(dataTypeSchema)) {
        return Datatypes.object
    } else {
        return Datatypes.array
    }
}