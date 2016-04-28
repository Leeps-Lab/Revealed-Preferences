RedwoodRevealedPreferences.factory("RPTatonnement", function () {
    var api = {};

    /* Private Functions */
    var sign = function (value) {
        return value < 0 ? -1 : 1;
    }

    /* Exported Functions */

    api.getSubjectData = function (subjects) {
        return subjects.map(function(subject) {
            return {
                "selection": subject.get("rp.selection"),
                "endowment": subject.get("rp.endowment"),
                "group": subject.get("rp.group"),
                "inTTM": subject.get("rp.inTTM")
            };
        });
    }


    // Sum of excessDemand for entire array
    // excessDemand = selection.x - endowment.x
    api.excessDemand = function(subjectData) {
        return subjectData.reduce(function(sum, data) {
            if (data.inTTM) {
console.log("inTTM: " + data.inTTM + "\n");
console.log("selection: " + data.selection + "\n");
console.log("sum: " + sum + " + excessDemand: " + (data.selection[0] - data.endowment.x) +
                " = return: " + (sum + (data.selection[0] - data.endowment.x)) + "\n");
                return sum + (data.selection[0] - data.endowment.x);
            } else {
console.log("return sum: " + sum + "\n");
                return sum;
            }
        }, 0); 
    }

// excessDemandPerCapita = excessDemand / (subjectData.length - 2)
    api.RoundContext = function(price, subjectData) {
        var excessDemand = api.excessDemand(subjectData);
        return {
            "price":                 price,
            "subjectData":           subjectData,
            "excessDemand":          excessDemand,
            "excessDemandPerCapita": excessDemand / (subjectData.length - 2),
        };
    }

    api.TatonnementAlgorithm = function(config) {
        var excessDemandHistory1 = [];
        var excessDemandHistory2 = [];
        var _weightIndex1 = 0;
        var _weightIndex2 = 0;

        var _weightVector = config.weightVector;
        var _expectedExcess = config.expectedExcess;
        
        var _priceLowerBound = config.priceLowerBound;
        var _priceUpperBound = config.priceUpperBound;
        var _maxAngularDiff = config.maxAngularDiff;

        var _priceGrid = config.priceGrid;
        var _snapPriceToGrid1 = config.snapPriceToGrid;
        var _snapPriceToGrid2 = config.snapPriceToGrid;

        var priceSnappedToGrid = function(price) {
            return _priceGrid.sort(function(gridPrice1, gridPrice2) {
                return Math.abs(gridPrice1 - price) - Math.abs(gridPrice2 - price);
            })[0];
        }

        // var weightVectorFinished = function() {
        //     return _weightIndex >= _weightVector.length
        // }

        var addExcessDemand1 = function(excessDemand) {
            // increment weight index if the sign of the excess demand changes
            if (excessDemandHistory1.length > 0) {
                var previousDemand = excessDemandHistory1[excessDemandHistory1.length - 1];

                if (excessDemand * previousDemand < 0) {
                    _weightIndex1 = Math.min(_weightIndex1 + 1, _weightVector.length - 1); //_weightIndex1 never moves beyond end of _weightVector
                }
            }
            excessDemandHistory1.push(excessDemand);
        }

        var addExcessDemand2 = function(excessDemand) {
            // increment weight index if the sign of the excess demand changes
            if (excessDemandHistory2.length > 0) {
                var previousDemand = excessDemandHistory2[excessDemandHistory2.length - 1];

                if (excessDemand * previousDemand < 0) {
                    _weightIndex2 = Math.min(_weightIndex2 + 1, _weightVector.length - 1); //_weightIndex2 never moves beyond end of _weightVector
                }
            }
            excessDemandHistory2.push(excessDemand);
        }

// PROBABLY NEED TO CHANGE THIS
        var adjustedPrice1 = function(roundContext) {
            var adjustedPrice1;
            var excessDemandSign = sign(roundContext.excessDemand);

            var weight = _weightVector[_weightIndex1] / _expectedExcess;

console.log("excessDemandPerCapita1: " + roundContext.excessDemandPerCapita + "\n");
console.log("weight1: " + weight + "\n");
                
            // make sure angular difference is no more than 15 degrees
            var angularDiff = weight * roundContext.excessDemandPerCapita;
            var maxAngularDiff = _maxAngularDiff * excessDemandSign;
            var constrainedAngularDiff = Math.min(Math.abs(angularDiff), Math.abs(maxAngularDiff)) * excessDemandSign;
            var newPriceAngle = Math.atan(roundContext.price) + constrainedAngularDiff;

console.log("A1: " + angularDiff + "\n");
console.log("B1: " + maxAngularDiff + "\n");
console.log("C1: " + constrainedAngularDiff + "\n");


            // make sure that 0.01 <= price <= 100
            var priceLowerBoundAngle = Math.atan(_priceLowerBound);
            var priceUpperBoundAngle = Math.atan(_priceUpperBound);
            if (constrainedAngularDiff < 0) {
                adjustedPrice1 = Math.tan(Math.max(newPriceAngle, priceLowerBoundAngle));
            } else {
                adjustedPrice1 = Math.tan(Math.min(newPriceAngle, priceUpperBoundAngle));
            }

console.log("pnosnap1: " + adjustedPrice1 + "\n");

            if (_snapPriceToGrid1) {
                var snappedPrice = priceSnappedToGrid(adjustedPrice1);
                if (snappedPrice == roundContext.price) {
                    _snapPriceToGrid1 = false;
                } else {
                    adjustedPrice1 = snappedPrice;
                }
            }

console.log("psnap1: " + adjustedPrice1 + "\n");
            return adjustedPrice1;
        }


        var adjustedPrice2 = function(roundContext) {
            var adjustedPrice2;
            var excessDemandSign = sign(roundContext.excessDemand);

            var weight = _weightVector[_weightIndex2] / _expectedExcess;

console.log("excessDemandPerCapita2: " + roundContext.excessDemandPerCapita + "\n");
console.log("weight2: " + weight + "\n");
                
            // make sure angular difference is no more than 15 degrees
            var angularDiff = weight * roundContext.excessDemandPerCapita;
            var maxAngularDiff = _maxAngularDiff * excessDemandSign;
            var constrainedAngularDiff = Math.min(Math.abs(angularDiff), Math.abs(maxAngularDiff)) * excessDemandSign;
            var newPriceAngle = Math.atan(roundContext.price) + constrainedAngularDiff;

console.log("A2: " + angularDiff + "\n");
console.log("B2: " + maxAngularDiff + "\n");
console.log("C2: " + constrainedAngularDiff + "\n");


            // make sure that 0.01 <= price <= 100
            var priceLowerBoundAngle = Math.atan(_priceLowerBound);
            var priceUpperBoundAngle = Math.atan(_priceUpperBound);
            if (constrainedAngularDiff < 0) {
                adjustedPrice2 = Math.tan(Math.max(newPriceAngle, priceLowerBoundAngle));
            } else {
                adjustedPrice2 = Math.tan(Math.min(newPriceAngle, priceUpperBoundAngle));
            }

console.log("pnosnap2: " + adjustedPrice2 + "\n");

            if (_snapPriceToGrid2) {
                var snappedPrice = priceSnappedToGrid(adjustedPrice2);
                if (snappedPrice == roundContext.price) {
                    _snapPriceToGrid2 = false;
                } else {
                    adjustedPrice2 = snappedPrice;
                }
            }

console.log("psnap2: " + adjustedPrice2 + "\n");
            return adjustedPrice2;
        }

        var adjustedAllocation = function (selection, endowment, roundContext, marketMaker) {
            var allocation = {};
            
            var netBuyers = roundContext.subjectData.filter(function(subject) {
                if (!subject.inTTM){
                    return false;   
                } else {
                    return subject.selection[0] > subject.endowment.x;
                }
            }).length;

            var netSellers = roundContext.subjectData.filter(function(subject) {
                if (!subject.inTTM) {
                    return false;
                } else {
                    return subject.selection[0] < subject.endowment.x;
                }
            }).length;
            
            if (roundContext.subjectData.inTTM){
                if (marketMaker) {
                    allocation.x = selection[0];
                    allocation.y = selection[1];
                } else {
                    if (selection[0] > endowment.x) { // net buyer
                        var halfExcessPerBuyer = roundContext.excessDemand / (2 * netBuyers);
                        allocation.x = selection[0] - halfExcessPerBuyer;
                        allocation.y = selection[1] + roundContext.price * halfExcessPerBuyer;
                    } else if (selection[0] < endowment.x) { // net seller
                        var halfExcessPerSeller = roundContext.excessDemand / (2 * netSellers);
                        allocation.x = selection[0] + halfExcessPerSeller;
                        allocation.y = selection[1] - roundContext.price * halfExcessPerSeller;
                    } else { // chooses endowment
                        allocation.x = selection[0];
                        allocation.y = selection[1];
                    }
                }
            } else {
                allocation.x = selection[0];
                allocation.y = selection[1];
            }
            return allocation;
        }

        return {
            // "weightVectorFinished": weightVectorFinished,
            "addExcessDemand1": addExcessDemand1,
            "addExcessDemand2": addExcessDemand2,
            "adjustedPrice1": adjustedPrice1,
            "adjustedPrice2": adjustedPrice2,
            "adjustedAllocation": adjustedAllocation
        };
    }

    return api;
});
