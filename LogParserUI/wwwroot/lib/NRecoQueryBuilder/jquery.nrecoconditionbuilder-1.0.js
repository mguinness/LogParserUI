//
// NReco Condition Builder Plugin (https://www.nrecosite.com/query_builder_js.aspx)
// nrecoQueryBuilder is a jQuery plugin for composing and editing query conditions.
// @version 1.0
// @author Vitaliy Fedorchenko
// @license MIT
// 
// Copyright (c) Vitaliy Fedorchenko (nrecosite.com) - All Rights Reserved
// THIS CODE AND INFORMATION ARE PROVIDED "AS IS" WITHOUT WARRANTY OF ANY 
// KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A
// PARTICULAR PURPOSE.
//

(function ($) {

	$.fn.nrecoConditionBuilder = function (settings) {
		if (typeof settings == "string") {
			var targetMethod = this.data(settings);
			if (targetMethod && (typeof targetMethod) == "function") {
				return targetMethod.apply(this, Array.prototype.slice.call(arguments, 1));
			} else {
				$.error('Method ' + settings + ' does not exist');
			}
		}	
		
		var settings = $.extend({}, $.fn.nrecoConditionBuilder.defaults, settings);

		this.each(function () {
			var $t = $(this);
			init($(this), settings);
		});
		
		function init(k, o) {
			var $container = k;
			$container.addClass('nrecoConditionBuilderContainer');
			var $conditionContainer = $('<div class="nrecoConditionBuilderConditionContainer"/>');
			$container.append($conditionContainer);

			$container.data(
				'reset',
				function () {
					$conditionContainer.find('.nrecoConditionBuilderConditionRow').each(function () { removeRow($conditionContainer, o, $(this)); });
					addRow($conditionContainer, o);
				}
			);
			$container.data(
				'addConditions',
				function (conditions) {
					//remove empty row
					$conditionContainer.find(".nrecoConditionBuilderConditionRow.empty").each(function () {
						removeRow($conditionContainer, o, $(this));
					});

					for (var idx = 0; idx < conditions.length; idx++) {
						var fldData = findArrayObjByProp(o.fields, 'name', conditions[idx].field);
						if (fldData != null)
							addRow($conditionContainer, o, conditions[idx]);
					}
					//add empty row at the end
					addRow($conditionContainer, o);
				}
			);
			$container.data(
				'getConditions',
				function () {
					return getConditions($conditionContainer, o);
				}
			);

			if (o.showExpressionSelector) {
				var $expressionContainer = $('<div class="nrecoConditionBuilderExpressionContainer"/>');
				$container.append($expressionContainer);
				addExpressionTypeSelector($expressionContainer, o, $conditionContainer);

				var baseOnRowAdded = o.onRowAdded;
				o.onRowAdded = function ($row) {
					refreshExpressionCustomInput($expressionContainer, o, getConditions($conditionContainer, o), true);
					baseOnRowAdded($row);
				};
				var baseOnRowRemoved = o.onRowRemoved;
				o.onRowRemoved = function ($row) {
					refreshExpressionCustomInput($expressionContainer, o, getConditions($conditionContainer, o));
					baseOnRowRemoved($row);
				};

				$container.data(
					'getExpression',
					function () {
						var exprTypeValue = $expressionContainer.find('select.expressionTypeSelector').val();
						var exprType = findArrayObjByProp(o.expressionTypes, 'value', exprTypeValue);
						if (!exprType.showInput)
							refreshExpressionCustomInput($expressionContainer, o, getConditions($conditionContainer, o));
						var customExprInput = $expressionContainer.find('input.customExpression').val();
						return {
							type: exprTypeValue,
							expression: customExprInput
						};
					}
				);
				$container.data(
					'setExpression',
					function (exprTypeValue, customExpression) {
						var exprType = findArrayObjByProp(o.expressionTypes, 'value', exprTypeValue);
						$expressionContainer.find('select.expressionTypeSelector').val(exprTypeValue).change();
						if (exprType.showInput) {
							$expressionContainer.find('input.customExpression').val(customExpression);
						}
					}
				);
			}

			addRow($conditionContainer, o);
		}

		function refreshExpressionCustomInput($expressionContainer, config, currentConditions, isRowAdded) {
			isRowAdded = isRowAdded ? true : false;
			var currentExprTypeValue = $expressionContainer.find('select.expressionTypeSelector').val();
			var exprType = findArrayObjByProp(config.expressionTypes, 'value', currentExprTypeValue);
			var cIndexes = [];
			for (var cIdx = 0; cIdx < currentConditions.length; cIdx++)
				cIndexes[cIdx] = cIdx + 1;
			var $customExprInput = $expressionContainer.find('input.customExpression');
			$customExprInput.val(
				exprType.generateExpression(currentConditions, cIndexes, $customExprInput.val(), isRowAdded));
		}

		function getConditions($container, config) {
			var conditions = [];
			$container.find(".nrecoConditionBuilderConditionRow").each(function () {
				var $row = $(this);
				if (!$row.hasClass('empty')) {
					var fieldName = $row.find('.nrecoConditionBuilderFieldSelector select').val();
					var fldData = findArrayObjByProp(config.fields, 'name', fieldName);
					var renderer = findArrayObjByProp(config.renderers, 'name', fldData.renderer.name);

					conditions.push({
						field: fieldName,
						condition: $row.find('.nrecoConditionBuilderConditionSelector select').val(),
						value: renderer.getValue($row.find('.nrecoConditionBuilderValue'))
					});
				}
			});
			return conditions;
		}

		function addExpressionTypeSelector($container, config, $conditionContainer) {
			var $select = $('<select class="expressionTypeSelector"/>');
			for (var exprIdx = 0; exprIdx < config.expressionTypes.length; exprIdx++) {
				var exprType = config.expressionTypes[exprIdx];
				$select.append($('<option>').attr('value', exprType.value).html(exprType.text));
			}
			$container.append($select);
			var $textBox = $('<input type="text" class="customExpression"/>');
			if (config.expressionTypes.length > 0)
				setVisible($textBox, config.expressionTypes[0].showInput);
			$container.append($textBox);

			$select.change(function () {
				var newExprTypeValue = $(this).val();
				var exprType = findArrayObjByProp(config.expressionTypes, 'value', newExprTypeValue);
				setVisible($textBox, exprType.showInput);

				refreshExpressionCustomInput($container, config, getConditions($conditionContainer, config));
			});
		}

		function setVisible($elem, flag) {
			if (flag)
				$elem.show();
			else
				$elem.hide();
		}

		function addRow($container, config, defaultState) {
			var $row = $("<div class='nrecoConditionBuilderConditionRow'><span class='rowIndex'></span><span class='rowContainer'/></div>");
			$container.append($row);

			var $fldSelectorContainer = renderFieldSelector(config);
			var $rowContainer = $row.find('.rowContainer');
			$rowContainer.append($fldSelectorContainer);
			var $fldSelector = $fldSelectorContainer.find('select');
			$fldSelector.change(function () {
				var $select = $(this);
				var $row = $select.parents('.nrecoConditionBuilderConditionRow');
				if ($select.val() == "") {
					removeRow($container, config, $row);
				} else {
					$row.removeClass("empty");
					$row.find('.nrecoConditionBuilderConditionSelector,.nrecoConditionBuilderValue').remove();

					var $conditionSelectorContainer = renderFieldCondition(config, $select.val());
					$rowContainer.append($conditionSelectorContainer);

					var $valueSelector = renderFieldValue(config, $select.val(), void (0), $rowContainer, $conditionSelectorContainer);
					//$row.append($valueSelector);
				}
				//add empty row
				if ($container.find(".nrecoConditionBuilderConditionRow.empty").length == 0)
					addRow($container, config);
			});
			// set default state
			if (typeof (defaultState) != 'undefined') {
				var fldData = findArrayObjByProp(config.fields, 'name', defaultState.field);
				if (fldData != null) {
					$fldSelector.val(defaultState.field);

					var $conditionSelectorContainer = renderFieldCondition(config, defaultState.field, defaultState.condition);
					$rowContainer.append($conditionSelectorContainer);

					var $valueSelector = renderFieldValue(config, defaultState.field, defaultState.value, $rowContainer, $conditionSelectorContainer);
					//$row.append($valueSelector);
				}
			} else {
				$row.addClass("empty");
			}

			//$container.append($row);
			refreshRowIndexes($container, config);
			config.onRowAdded($row);
		}

		function removeRow($container, config, $row) {
			$row.addClass('empty');
			$row.remove();
			refreshRowIndexes($container, config);
			config.onRowRemoved($row);
		}

		function refreshRowIndexes($container, config) {
			if (!config.showRowIndex)
				return;
			var index = 1;
			$container.find('.nrecoConditionBuilderConditionRow').each(function () {
				$(this).find('.rowIndex').html(index);
				index++;
			});
		}

		function renderFieldSelector(config) {
			var $select = $('<select/>');
			$select.append($('<option value="">').html(config.notSelectedFieldText));
			for (var fldIdx = 0; fldIdx < config.fields.length; fldIdx++) {
				var fldData = config.fields[fldIdx];
				$select.append($('<option>').attr('value', fldData.name).html(fldData.caption));
			}
			var $selectHolder = $('<span class="nrecoConditionBuilderFieldSelector"></span>');
			$selectHolder.append($select);
			return $selectHolder;
		}

		function findArrayObjByProp(arr, propName, propValue) {
			for (var arrIdx = 0; arrIdx < arr.length; arrIdx++)
				if (arr[arrIdx][propName] == propValue)
					return arr[arrIdx];
			return null;
		}

		function renderFieldValue(config, fieldName, defaultValue, row, conditionSelectorContainer) {
			var fldData = findArrayObjByProp(config.fields, 'name', fieldName);
			var renderer = findArrayObjByProp(config.renderers, 'name', fldData.renderer.name);
			var placeHolder = $('<span class="nrecoConditionBuilderValue"/>');
			row.append(placeHolder);
			var html = renderer.render({ config: config, field: fldData, defaultValue: defaultValue, placeHolder: placeHolder, condition: conditionSelectorContainer.find('select').val() });
			if (html) {
				placeHolder.append(html);
			}

			if (conditionSelectorContainer && typeof (renderer.renderOnConditionChange) == 'boolean' && renderer.renderOnConditionChange) {
				conditionSelectorContainer.find('select').change(function () {
					renderFieldValue(config, fieldName, renderer.getValue(placeHolder), row);
				});
			}
			return placeHolder;
		}

		function renderFieldCondition(config, fieldName, defaultValue) {
			var $select = $('<select/>');
			var fldData = findArrayObjByProp(config.fields, 'name', fieldName);
			if (typeof (fldData.conditions) != 'undefined' && fldData.conditions != null)
				for (var cIdx = 0; cIdx < fldData.conditions.length; cIdx++) {
					var cData = fldData.conditions[cIdx];
					$select.append($('<option>').attr('value', cData.value).html(cData.text));
				}
			if (typeof (defaultValue) != 'undefined') {
				$select.val(defaultValue);
			}
			var $selectHolder = $('<span class="nrecoConditionBuilderConditionSelector"></span>');
			$selectHolder.append($select);
			return $selectHolder;
		}


	};

	//Default configuration:
	$.fn.nrecoConditionBuilder.defaults = {
		renderers: [
			{
				name: "textbox",
				render: function (c) {
					var config = c.config;
					var fieldData = c.field;
					var defaultValue = c.defaultValue;
					var $textbox = $('<input type="text"/>');
					if (typeof (defaultValue) != 'undefined') {
						$textbox.val(defaultValue);
					}
					return $textbox;
				},
				getValue: function ($valueContainer) {
					return $valueContainer.find('input').val();
				}
			},
			{
				name: "dropdownlist",
				render: function (c) {
					var config = c.config;
					var fieldData = c.field;
					var defaultValue = c.defaultValue;
					var $select = $('<select/>');
					var selectData
					if (typeof (fieldData.renderer.values) != 'undefined') {
						for (var valIdx = 0; valIdx < fieldData.renderer['values'].length; valIdx++) {
							var vData = fieldData.renderer['values'][valIdx];
							$select.append($('<option>').attr('value', vData.value).html(vData.text));
						}
						if (typeof (defaultValue) != 'undefined') {
							$select.val(defaultValue);
						}
					} else if (typeof (fieldData.renderer.getValues) == 'function') {
						fieldData.renderer.getValues(function (values) {
							for (var valIdx = 0; valIdx < values.length; valIdx++) {
								var vData = values[valIdx];
								$select.append($('<option>').attr('value', vData.value).html(vData.text));
							}
							if (typeof (defaultValue) != 'undefined') {
								$select.val(defaultValue);
							}
						});

					}
					return $select;
				},
				getValue: function ($valueContainer) {
					return $valueContainer.find('select').val();
				}
			},
			{
				name: "datepicker",
				render: function (c) {
					var config = c.config;
					var fieldData = c.field;
					var defaultValue = c.defaultValue;
					var $textbox = $('<input type="text"/>');
					if (typeof (defaultValue) != 'undefined') {
						$textbox.val(defaultValue);
					}
					if ($.fn.datepicker) {
						$textbox.datepicker(fieldData.renderer['options'] ? fieldData.renderer['options'] : {});
					}
					return $textbox;
				},
				getValue: function ($valueContainer) {
					return $valueContainer.find('input').val();
				}
			}
		],
		expressionTypes: [
			{
				value: 'all',
				text: 'Include all of the above',
				showInput: false,
				generateExpression: function (conditions, condIndexes) {
					return condIndexes.join(" and ");
				}
			},
			{
				value: 'any',
				text: 'Include any of the above',
				showInput: false,
				generateExpression: function (conditions, condIndexes) {
					return condIndexes.join(" or ");
				}
			},
			{
				value: 'custom',
				text: 'Custom condition',
				showInput: true,
				generateExpression: function (conditions, condIndexes, currentExpression, isRowAdded) {
					if (isRowAdded && conditions.length > 1 && $.trim(currentExpression) != '')
						return currentExpression + " and " + conditions.length;
					else
						return condIndexes.join(" and ");
				}
			}
		],
		fields: [],
		notSelectedFieldText: '-- select --',
		showRowIndex: true,
		showExpressionSelector: true,
		onRowAdded: function ($row) { },
		onRowRemoved: function ($row) { }
	};

	//Current version:
	$.fn.nrecoConditionBuilder.version = 1.0;

})(jQuery);
