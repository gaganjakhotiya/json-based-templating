import {validateJSON} from './validator'
import {getDataTypeFromSchema} from './utils'

export function setSchema(newSchema) {
    _schema = newSchema
}

export function getDOMElementFromJSON(json){
    try {
        validateJSON('__root', json, _schema)
    } catch (e) {
        return createDOMNode(e)
    }

    return createDOMNode(parseJSON(json, _schema))
}

// Private Stuff

let _schema

function getKeys(str){
	return str.match(/(?:^|\$){(.*?)(?:}|$)/g) || []
}
function createDOMNode(content){
    let node = document.createElement('div')
    node.innerHTML = content
    return node
}

function fillTemplate(template, valueMap){
    let out =  template ? getKeys(template).reduce((updatedTemplate, templateLiteral) => {
	    let templateKey = templateLiteral.substring(2, templateLiteral.length - 1)
          , value = valueMap[templateKey]
        return updatedTemplate.replace(templateLiteral, value == null ? '' : value)
    }, template) : ''

    return out
}

function parseJSON(json, schema, arrayTemplate){
    let output = ''
    if (Array.isArray(json)) {
        output = json.reduce((updatedTemplate, item) => {
            let value = typeof item === 'object' ? parseJSON(item, schema) : item

            return updatedTemplate + fillTemplate(arrayTemplate, {value: value})
        }, '')
    } else if (typeof json === 'object') {
        let valueMap = {...json}

        Object.keys(valueMap).forEach(field => {
            let fieldSchema = getDataTypeFromSchema(schema[field] || schema[field + '!'])
            if (!fieldSchema)
                return

            let fieldTemplate = schema[field + '__template']
            valueMap[field] = typeof valueMap[field] === 'object'
                ? parseJSON(valueMap[field], fieldSchema, fieldTemplate)
                : valueMap[field]
        })

        output = fillTemplate(schema.__template, valueMap)
    }
    return output
}