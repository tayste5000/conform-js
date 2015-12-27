const patterns = require("./patterns.js");

module.exports = function( connection ){

	return function( object, schema ){

		var errors = [];
		var promises = [];

		Object.keys(schema).forEach( function( prop ){

			var constraints = schema[prop]

			if (!object[prop]) {
				if (constraints.required){
					var err = new Error(`Property ${prop} is required`);
					errors.push(err);
				}

				return;
			}

			if (constraints.type && typeof object[prop] != constraints.type){
				var wrongType = typeof object[prop];
				var rightType = constraints.type;
				var err = new Error(`${prop} is of type ${wrongType}; should be of type ${rightType}`);

				errors.push(err);
				return;
			}

			if (constraints.pattern){

				if (!patterns[constraints.pattern]){
					var err = new Error(`Pattern ${constraints.pattern} does not exist (${prop})`);
					errors.push(err);
					return;
				}

				if (!patterns[constraints.pattern].test(object[prop])){
					var err = new Error(`Value of ${prop} does not match pattern ${constraints.pattern}`);
					errors.push(err);
					return;
				}
			}

			if (constraints.length){
				var lengthType = Object.keys(constraints.length)[0];
				var propLength =  typeof object[prop] == "number" ? object[prop] : object[prop].length;

				switch (lengthType){
					case "between": 
						var lens = constraints.length.between;
						if (!(propLength >= lens[0] && propLength <= lens[1])){
							var err = new Error(`Length of ${prop} is not between values ${lens[0]} and ${lens[1]}`);
							errors.push(err);
							return;
						}
						break;

					case "below":
						if (!(propLength <= constraints.length.below)){
							var err = new Error(`Length of ${prop} is not below ${constraints.length.below}`);
							errors.push(err);
							return;
						}
						break;

					case "above":

						if (!(propLength >= constraints.length.above)){
							var err = new Error(`Length of ${prop} is not above ${constraints.length.above}`);
							errors.push(err);
							return;
						}
						break;

					case "equals":
						if (!(propLength == constraints.length.equals)){
							var err = new Error(`Length of ${prop} is not equal to ${constraints.length.equals}`);
							errors.push(err);
							return;
						}
						break;

					default:
						err = new Error(`${lengthType} is not a valid length type (${prop})`);
						errors.push(err);
						break;
				}
			}

			if (constraints.unique){
				var query = {};
				query[prop] = object[prop];

				var promise = connection.get(constraints.unique.in, query)
					.then(function(result){
						var rows = result.rows;

						if (rows.length){
							var err = new Error(`${prop} with value ${object.prop} already exists`);
							errors.push(err);
						}
					});
				promises.push(promise);
			}

			if (constraints.exists){
				var tableName = constraints.exists.in;
				var columnName = constraints.exists.as;
				var query = {};
				query[columnName] = object[prop];

				var promise = connection.get(tableName, query)
					.then(function(result){
						var rows = result.rows;

						if (!rows.length){
							var err = new Error(`${columnName} in ${tableName} with value ${object[prop]} doesnt exist`);
							errors.push(err);
						}
					});

				promises.push(promise);
			}

		});

		return Promise.all( promises )
			.then(function(){
				return errors;
			});
	}
}