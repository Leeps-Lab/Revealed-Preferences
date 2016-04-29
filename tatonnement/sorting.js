RedwoodRevealedPreferences.factory("RPSorting", ["RedwoodSubject", function (rs) {

	var sign = function (value) {
        if (value < 0) 
            return -1;
        else if (value > 0) 
            return 1;
        else 
            return 0;
    }

	var api = {};

	api.EndowmentAssigner = function(subjects, options) {

        var defaults = {
            firstMarkets: true
        }
        for (var key in defaults) {
            if (!(key in options)) {
                options[key] = defaults[key];
            }
        }

        var getSellerGroup, getBuyerGroup;
        getSellerGroup = function(subjectIndex, subjectCount) {
            if (subjectIndex < (subjectCount/2)) {
                return 1;
            } else {
                return 2;
            }
        }
        if (options.firstMarkets) {
            getBuyerGroup = function(subjectIndex, subjectCount) {
                if (subjectIndex < (subjectCount/2)) {
                    return 1;
                } else {
                    return 2;
                }
            }
        } else {
            getBuyerGroup = function(subjectIndex, subjectCount) {
                if (subjectIndex < (subjectCount/2)) {
                    return 2;
                } else {
                    return 1;
                }
            }
        }

		var subjectCount = subjects.length;
        var allocationCount = subjects[0]["a"].length; // sub[i]["a"].x = x[i]
                                                       // sub[i]["a"].y = y[i]

        /******************************
        * Delete four subjects
        *******************************/ 

        // Split users into buyers and sellers
        // Set in config
        var sellers = [];
        var buyers = [];
        for (var i = 0; i < subjectCount; ++i) {
            if (subjects[i]["a"][0].seller == true) {
                sellers.push({
                    "id": subjects[i].id,
                    "a": subjects[i]["a"]
                });
            } else {
                buyers.push({
                    "id": subjects[i].id,
                    "a": subjects[i]["a"]
                });
            }
        }

        // Calculate noise       
        var dxSellers = [];
        var dySellers = [];
        var distSellers = [];
        for (var i = 0; i < sellers.length; ++i) {
            dxSellers.push([]); // dxSellers[][i] = x[i + 1] - x[i]
            dySellers.push([]); // dySellers[][i] = y[i + 1] - y[i]
            distSellers.push([]); // distSellers[][i] = [(x[i] - x[i-1])^2 + (y[i] - y[i-1])^2]^(1/2)

            for (var j = 0; j < allocationCount - 1; ++j) {
                dxSellers[i].push(sellers[i]["a"][j + 1].x - sellers[i]["a"][j].x);
                dySellers[i].push(sellers[i]["a"][j + 1].y - sellers[i]["a"][j].y);
                distSellers[i].push(Math.sqrt(
                                (Math.pow((sellers[i]["a"][j + 1].x - sellers[i]["a"][j].x), 2) + 
                                 Math.pow((sellers[i]["a"][j + 1].y - sellers[i]["a"][j].y), 2))));
            }    
        }

        // Calculate noise       
        var dxBuyers = [];
        var dyBuyers = [];
        var distBuyers = [];
        for (var i = 0; i < buyers.length; ++i) {
            dxBuyers.push([]); // dxBuyers[][i] = x[i + 1] - x[i]
            dyBuyers.push([]); // dyBuyers[][i] = y[i + 1] - y[i]
            distBuyers.push([]); // distBuyers[][i] = [(x[i] - x[i-1])^2 + (y[i] - y[i-1])^2]^(1/2)

            for (var j = 0; j < allocationCount - 1; ++j) {
                dxBuyers[i].push(buyers[i]["a"][j + 1].x - buyers[i]["a"][j].x);
                dyBuyers[i].push(buyers[i]["a"][j + 1].y - buyers[i]["a"][j].y);
                distBuyers[i].push(Math.sqrt(
                                (Math.pow((buyers[i]["a"][j + 1].x - buyers[i]["a"][j].x), 2) + 
                                 Math.pow((buyers[i]["a"][j + 1].y - buyers[i]["a"][j].y), 2))));
            }    
        }

        noiseSellers = sellers.map(function(seller, index) { 
            var noise = 0;
            for (var j = 1; j < allocationCount - 1; ++j) {
                if ((sign(dxSellers[index][j]) != sign(dxSellers[index][j - 1])) || 
                    (sign(dySellers[index][j]) != sign(dySellers[index][j - 1]))) {
                    noise += distSellers[index][j];
                }
            }
            return {
                "id": seller.id,
                "a": seller.a,
                "noise": noise
            };
        });

        noiseBuyers = buyers.map(function(buyer, index) { 
            var noise = 0;
            for (var j = 1; j < allocationCount - 1; ++j) {
                if ((sign(dxBuyers[index][j]) != sign(dxBuyers[index][j - 1])) || 
                    (sign(dyBuyers[index][j]) != sign(dyBuyers[index][j - 1]))) {
                    noise += distBuyers[index][j];
                }
            }
            return {
                "id": buyer.id,
                "a": buyer.a,
                "noise": noise
            };
        });
 
        // Sort in descending order of noise
        noiseSellers.sort(function(a, b) {
            return b.noise - a.noise;
        }).map(function (subject, index) {
            if (index == 0 || index == 1) {
                subject.inTTM = false;
            } else {
                subject.inTTM = true;
            }
            return subject;
        });
        noiseBuyers.sort(function(a, b) {
            return b.noise - a.noise;
        }).map(function (subject, index) {
            if (index == 0 || index == 1) {
                subject.inTTM = false;
            } else {
                subject.inTTM = true;
            }
            return subject;
        });

        if (noiseSellers[0]["a"].length != 25 || noiseBuyers[0]["a"].length != 25) {
            return {
                "getAssignedGroup": function(subject) {
                    return false;
                }
            };
        }
        finalSellers = noiseSellers.slice(0);
        finalBuyers = noiseBuyers.slice(0);
     
        finalSellers.splice(0, 2);
        finalBuyers.splice(0, 2);
      
        finalSellers.sort(function(a, b) {  
            var sA = 0;
            var sB = 0;
            for (var i = 7; i < 10; i++) {
                sA += a["a"][i].x;
                sB += b["a"][i].x;
            } 
            return sA - sB;
        }).map(function(subject, index) {
            subject.assignedGroup = getSellerGroup(index, finalSellers.length);
            return subject;
        });
        

        finalBuyers.sort(function(a, b) {
            var dA = 0;
            var dB = 0;
            for (var i = 7; i < 10; i++) {
                dA += a["a"][i].x;
                dB += b["a"][i].x;
            }
            return dA - dB;
        }).map(function(subject, index) {
            subject.assignedGroup = getBuyerGroup(index, finalBuyers.length);
            return subject;
        });


        var inTTMMap = {};
        var assignedGroupMap = {};
        var firstSeller = false;
        var firstBuyer = false;

        noiseSellers.forEach(function(subject) {
            console.log("inTTM: " + subject.inTTM + "\n");
            inTTMMap[subject.id] = subject.inTTM;
            if (subject.inTTM == false && firstSeller == false) {
                assignedGroupMap[subject.id] = 1;
            console.log("Setting subject " + subject.id + " to group 1 not in TTM\n");
                firstSeller = true;
            }
            else if (subject.inTTM == false && firstSeller == true) {
                assignedGroupMap[subject.id] = 2;
            console.log("Setting subject " + subject.id + " to group 2 not in TTM\n");
            }
        });

        noiseBuyers.forEach(function(subject) {
            console.log("inTTM: " + subject.inTTM + "\n");
            inTTMMap[subject.id] = subject.inTTM;
            if (subject.inTTM == false && firstBuyer == false) {
                assignedGroupMap[subject.id] = 1;
            console.log("Setting subject " + subject.id + " to group 1 not in TTM\n");
                firstBuyer = true;
            }
            else if (subject.inTTM == false && firstBuyer == true) {
                assignedGroupMap[subject.id] = 2;
            console.log("Setting subject " + subject.id + " to group 2 not in TTM\n");
            }
        });

        finalSellers.forEach(function(subject) {
            assignedGroupMap[subject.id] = subject.assignedGroup;
            console.log("Setting subject " + subject.id + " to group " + subject.assignedGroup + "\n");
        });

        finalBuyers.forEach(function(subject) {
            assignedGroupMap[subject.id] = subject.assignedGroup;
            console.log("Setting subject " + subject.id + " to group " + subject.assignedGroup + "\n");
        });

        return {
            "getAssignedGroup": function(subject) {
                return {
                    "group": assignedGroupMap[subject],
                    "inTTM": inTTMMap[subject]
                };
            }
        };
    }

	api.getAssignedGroup = function(subject, options) {
        var allocationData = api.sortAllocationData();
        return api.EndowmentAssigner(allocationData, options).getAssignedGroup(subject);
    }

    api.sortAllocationData = function() {
        // Returns list of allocations for every user
        // Allocations for each user are listed
        //   in ascending order of price
        var sortedAllocations = rs.subjects.map(function(subject) {

            var allocations = subject.get("rp.allocations").sort(function(a, b) {
                return a.price - b.price; // Sort in ascending order of price
            }).map(function(allocation) {
                return {
                    "x": allocation.x,
                    "y": allocation.y,
                    "price": allocation.price,
                    "seller": allocation.seller
                };
            });

            return {
                "id": subject.user_id,
                "a": allocations
            };
        });

        return sortedAllocations;
    }

    api.save = function () {
        // register listeners to automatically save allocations for this round
        rs.on("rp.perform_allocation", function (allocation) {
        	var key = "rp.allocations";
            console.log("saving: " + allocation.x + " at " + key);
            var allocations = rs.self.get(key) || [];
            allocations.push({
                "price": rs.config.Price,
                "x": allocation.x,
                "y": allocation.y,
                "seller": rs.self.get("rp.seller")
            });
            rs.set(key, allocations);
        });
    }

	return api;

}]);