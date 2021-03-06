RedwoodRevealedPreferences.controller("RPStartController", 
    ["$scope",
     "RedwoodSubject",
     "SynchronizedStopWatch",
     "RPTatonnement",
     "RPSorting",
     "ConfigManager",
    function ($scope, rs, stopWatch, ta, ea, configManager) {

    // module private variables
    var tatonnement;

    function animateLimits () {
        var larger = $scope.intercepts.x > $scope.intercepts.y
            ? $scope.intercepts.x
            : $scope.intercepts.y;

        var lastLimits = rs.self.get("rp.last_limits");

        var baseLimits = {};
        baseLimits.x = $scope.currentRound > 1 ? lastLimits.x : $scope.limits.x;
        baseLimits.y = $scope.currentRound > 1 ? lastLimits.y : $scope.limits.y;

        $(baseLimits).animate({x: larger, y: larger}, {
            duration: $scope.config.limitAnimDuration,
            easing: "easeInOutCubic",
            step: function (now, fx) {
                if (!$scope.$$phase) {
                    $scope.$apply(function () {
                        $scope.limits[fx.prop] = now;
                    })
                } else {
                    $scope.limits[fx.prop] = now;
                }
            }
        });

        rs.set("rp.last_limits", {x: larger, y: larger});
    }

    rs.on_load(function () {

        function extractConfigEntry (entry, index) {
            return $.isArray(entry) ? entry[userIndex] : entry
        }
        var userIndex = (parseInt(rs.user_id) - 1) % 2;

        $scope.config = configManager.loadPerSubject(rs, {

            /* Endowment, Price and Probability Options */
            Ex                      : 0,       
            Ey                      : 0,
            Price                   : 1,
            ProbX                   : 0.5,
            useDefaultSelection     : false,

            /* Visual Options */
            XLimit                  : 100,
            YLimit                  : 100,
            labelX                  : "X",
            labelY                  : "Y",
            limitAnimDuration       : 0,
            plotResult              : true,
            showEndowment           : true,
            showTable               : false,
            showMaxPayouts          : true,

            /* Interaction Options */
            constraintsX            : false,
            
            /* Timing Options */
            rounds                  : 1,
            delay                   : 5,
            timeLimit               : 0,
            pause                   : false,

            /* Tatonnement Options */
            epsilon1                : 1,        
            epsilon2                : 2,
            roundsUnderEpsilon      : 2,
            expectedExcess          : 13.5,
            priceLowerBound         : 0.01,
            priceUpperBound         : 100.0,
            maxAngularDiff          : 0.26175,
            marketMaker             : true,
            snapPriceToGrid         : true,
            priceGrid               : [0.2, 0.28, 0.36, 0.43, 0.5, 0.57, 0.64, 0.7, 0.76, 0.83, 0.89, 0.94,
                                       1, 10.6, 1.13, 1.21, 1.31, 1.43, 1.57, 1.75, 2, 2.33, 2.81, 3.57, 5],
            weightVector            : [0.1745, 0.08725, 0.043625, 0.0218125, 0.01090625],
            TTMPeriod               : false,   // True for all TTM periods      
            firstMarkets            : true,    // True for first TTM Period
            seller                  : true,    // True for all "sellers" in market
            saveAllocation          : false,   // True for all periods whose decisions 
                                               // should be used to determine TTM prices
        });

        $scope.endowment = {
            x: $scope.config.Ex,
            y: $scope.config.Ey
        };

        rs.set("rp.seller", $scope.config.seller);

        if ($scope.config.TTMPeriod) {
            var assignedGroup = ea.getAssignedGroup(rs.self.user_id, {
                firstMarkets : $scope.config.firstMarkets            
            });

            $scope.assignedGroup = assignedGroup.group;
            $scope.inTTM = assignedGroup.inTTM;

            rs.set("rp.assignedGroup", $scope.assignedGroup);
            rs.set("rp.inTTM", $scope.inTTM);
        }

        if ($scope.config.showEndowment) {
            $scope.shownEndowment = $scope.endowment;
        }

        $scope.currentRound = 0;
        $scope.inputEnabled = false;

        tatonnement = ta.TatonnementAlgorithm($scope.config);

        rs.trigger("rp.configuration", $scope.config);
        rs.trigger("rp.endowment", $scope.endowment);
        rs.trigger("rp.next_round");              

        if ($scope.config.saveAllocation) {
            ea.save();
        }
    });

    rs.on("rp.next_round", function () {

        //Reset the text on the button to reflect that it is 'active'
        $scope.ButtonText = "Confirm";
        $scope.waiting = true;

        // Begin next round
        $scope.currentRound++;
        $scope.cursor = undefined;
        $scope.selection = null;
        if ($scope.config.useDefaultSelection) {
            $scope.selection = [$scope.endowment.x, $scope.endowment.y];
        }
        rs.trigger("rp.selection", $scope.selection);

        // set initial price
        var price = rs.self.get("rp.price");
        $scope.price = $scope.currentRound > 1 ? price : $scope.config.Price;

        // find x and y intercepts
        $scope.intercepts = {};
        $scope.intercepts.x = $scope.endowment.x + $scope.endowment.y / $scope.price;
        $scope.intercepts.y = $scope.endowment.y + $scope.price * $scope.endowment.x;

        // set plot limits
        $scope.limits = {};
        $scope.limits.x = $scope.config.XLimit ? $scope.config.XLimit : $scope.intercepts.x;
        $scope.limits.y = $scope.config.YLimit ? $scope.config.YLimit : $scope.intercepts.y;
        animateLimits();

        // set budget functions
        $scope.budgetFunction = function (x) {
            return $scope.endowment.y + $scope.price * ($scope.endowment.x - x);
        }
        $scope.inverseBudgetFunction = function (y) {
            return $scope.endowment.x + ($scope.endowment.y - y) / $scope.price;
        }

        rs.trigger("rp.round_started", {
            "round": $scope.currentRound,
            "endowment": $scope.endowment,
            "price": $scope.price,
            "market": $scope.assignedGroup,
            "inTTM": $scope.inTTM

        });

        if ($scope.group1Finished && $scope.group2Finished) {
            $scope.selection = rs.self.get("rp.final_allocation");
            rs.trigger("rp.selection", $scope.selection);
            document.getElementById("modalMessage").innerHTML = 
                                "The period is over for your market. Your choice of " + 
                                $scope.selection[0].toFixed(2) + " X and " + 
                                $scope.selection[1].toFixed(2) + " Y is final. Click anywhere to continue.";
            $("#marketModal").modal();
            setTimeout(function(){$scope.confirm()}, 7000);
        } else if ((rs.self.get("rp.assignedGroup") == 1 && $scope.group1Finished) ||
            (rs.self.get("rp.assignedGroup") == 2 && $scope.group2Finished)) {
            $scope.selection = rs.self.get("rp.final_allocation");
            rs.trigger("rp.selection", $scope.selection);
            document.getElementById("modalMessage").innerHTML = 
                                "The period is over for your market. Your choice of " + 
                                $scope.selection[0].toFixed(2) + " X and " + 
                                $scope.selection[1].toFixed(2) + " Y is final. Click anywhere to continue " +
                                "while we wait for the other market to finish.";
            $("#marketModal").modal();
            setTimeout(function(){$scope.confirm()}, 5000);
        } else {
            $scope.inputEnabled = true;

            // flash the Confirm Selection button to alert the subject that a new round started
            // ooh the dirty dirty JQuery (.n.)
            var confirmButton = $("#confirmButton");
            confirmButton.effect("highlight", {color: "#c6feb6"}, 500, function() {
                confirmButton.effect("highlight", {color: "#c6feb6"}, 500);
            });

         }

        // setup timer
        if ($scope.config.timeLimit > 0) {
            if (!$scope.stopWatch) {
                $scope.timeRemaining = 0;
                // The round which this timer was started
                $scope.timerRound = $scope.currentRound;
                $scope.stopWatch = stopWatch.instance()
                    .frequency(1)
                    .duration($scope.config.timeLimit)
                    .onTick(function (tick, t) {
                        $scope.timeRemaining = $scope.timeTotal - t;
                    })
                    .onComplete(function () {
                        $scope.confirm();
                        $scope.stopWatch = null;
                    }).start();
            } else {
                $scope.stopWatch.duration($scope.stopWatch.getDurationInTicks() + $scope.config.timeLimit - $scope.timeRemaining)
            }

            $scope.timeTotal = $scope.stopWatch.getDurationInTicks();
        }
    });

    rs.on("rp.selection", function (selection) {
        $scope.selection = selection;
    });

    rs.on("rp.confirm", function (position) {
        $scope.inputEnabled = false; // for recovery

        //Switch text on the button so that participant knows button has been pressed
        $scope.ButtonText = "Confirmed";
        $scope.waiting = false;

        rs.synchronizationBarrier('rp.round_' + $scope.currentRound).then(function () {

            // If this is a TTM period
            if (rs.self.get("rp.assignedGroup")) {

                // Calculate current price
                var currentPrice = $scope.price;
                var newPrice = currentPrice;

                // Check if current price is "in the grid"
                var inGrid = false;
                for (var i = 0; i < $scope.config.priceGrid.length; i++){
                    if (currentPrice === $scope.config.priceGrid[i]) {
                        inGrid = true;
                    }
                }            

                // Split subjects into groups
                var group1 = [];
                var group2 = [];
                for (var i = 0; i < rs.subjects.length; i++) {
                    if (rs.subjects[i].get("rp.assignedGroup") == 1) {
                        group1.push(rs.subjects[i]);
                    } else {
                        group2.push(rs.subjects[i]);
                    }
                }

                if (rs.self.get("rp.assignedGroup") == 1 && !$scope.group1Finished) {

                    // Compute tatonnement data for this round
                    var subjectData1 = ta.getSubjectData(group1);
                    var roundContext1 = ta.RoundContext(currentPrice, subjectData1);

                    // Add excess demand to history
                    tatonnement.addExcessDemand1(roundContext1.excessDemand);

                    // check if demand is under either threshold (epsilon1, epsilon2)
                    var roundsUnder1_1 = rs.self.get("rp.rounds_under_epsilon1_1");
                    if (Math.abs(roundContext1.excessDemandPerCapita) < $scope.config.epsilon1) {
                        roundsUnder1_1 += 1;
                    } else {
                        roundsUnder1_1 = 0;
                    }
                    rs.set("rp.rounds_under_epsilon1_1", roundsUnder1_1);
                    // epsilon2 has the added condition that the price not be in the grid
                    var roundsUnder2_1 = rs.self.get("rp.rounds_under_epsilon2_1");
                    if (!inGrid && Math.abs(roundContext1.excessDemandPerCapita) < $scope.config.epsilon2) {
                        roundsUnder2_1 += 1;
                    } else {
                        roundsUnder2_1 = 0;
                    }
                    rs.set("rp.rounds_under_epsilon2_1", roundsUnder2_1);

                    // If demand has been under threshold for @roundsUnderEpsilon rounds,
                    // or if the maximum number of rounds have been played, stop tatonnement
                    if (   roundsUnder1_1        >= $scope.config.roundsUnderEpsilon
                        || roundsUnder2_1        >= $scope.config.roundsUnderEpsilon
                        || $scope.currentRound   >= $scope.config.rounds) {

                        var actualAllocation = tatonnement.adjustedAllocation(
                                                    $scope.selection,
                                                    $scope.endowment,
                                                    roundContext1,
                                                    $scope.config.marketMaker);

                        $scope.selection = [actualAllocation.x, actualAllocation.y];

                        rs.set("rp.final_allocation", $scope.selection);

                        // reset rounds under epsilon
                        rs.set("rp.rounds_under_epsilon1_1", 0);
                        rs.set("rp.rounds_under_epsilon2_1", 0);

                        // Only does anything if config.saveAllocation is True
                        rs.trigger("rp.perform_allocation", actualAllocation);

                        // Mark group as finished
                        rs.trigger("rp.group1Finished");
                        rs.send("rp.group1Finished");

                    } else {
                        // Get adjusted price
                        newPrice = tatonnement.adjustedPrice1(roundContext1);
                    }

                } else if (rs.self.get("rp.assignedGroup") == 2 && !$scope.group2Finished) {
                    // Compute tatonnement data for this round
                    var subjectData2 = ta.getSubjectData(group2);
                    var roundContext2 = ta.RoundContext(currentPrice, subjectData2);

                    // Add excess demand to history
                    tatonnement.addExcessDemand2(roundContext2.excessDemand);

                    // check if demand is under either threshold (epsilon1, epsilon2)
                    var roundsUnder1_2 = rs.self.get("rp.rounds_under_epsilon1_2");
                    if (Math.abs(roundContext2.excessDemandPerCapita) < $scope.config.epsilon1) {
                        roundsUnder1_2 += 1;
                    } else {
                        roundsUnder1_2 = 0;
                    }
                    rs.set("rp.rounds_under_epsilon1_2", roundsUnder1_2);
                    // epsilon2 has the added condition that the price not be in the grid
                    var roundsUnder2_2 = rs.self.get("rp.rounds_under_epsilon2_2");
                    if (!inGrid && Math.abs(roundContext2.excessDemandPerCapita) < $scope.config.epsilon2) {
                        roundsUnder2_2 += 1;
                    } else {
                        roundsUnder2_2 = 0;
                    }
                    rs.set("rp.rounds_under_epsilon2_2", roundsUnder2_2);

                    // If demand has been under threshold for @roundsUnderEpsilon rounds,
                    // or if the maximum number of rounds have been played, stop tatonnement
                    if (   roundsUnder1_2        >= $scope.config.roundsUnderEpsilon
                        || roundsUnder2_2        >= $scope.config.roundsUnderEpsilon
                        || $scope.currentRound   >= $scope.config.rounds) {

                        var actualAllocation = tatonnement.adjustedAllocation(
                                                    $scope.selection,
                                                    $scope.endowment,
                                                    roundContext2,
                                                    $scope.config.marketMaker);

                        $scope.selection = [actualAllocation.x, actualAllocation.y];

                        rs.set("rp.final_allocation", $scope.selection);

                        // reset rounds under epsilon
                        rs.set("rp.rounds_under_epsilon1_2", 0);
                        rs.set("rp.rounds_under_epsilon2_2", 0);

                        // Only does anything if config.saveAllocation is True
                        rs.trigger("rp.perform_allocation", actualAllocation);

                        // Mark group as finished
                        rs.trigger("rp.group2Finished");
                        rs.send("rp.group2Finished");

                    } else {
                        // Get adjusted price
                        newPrice = tatonnement.adjustedPrice2(roundContext2);
                    }

                } else if ($scope.group1Finished == true && $scope.group2Finished == true) {
                    rs.next_period();
                    return;
                } 

                // Proceed to next round
                rs.set("rp.price", newPrice);
                rs.trigger("rp.next_round");
                
            } 
            // Non-TTM Periods
            else {
                var actualAllocation = {
                    "x": $scope.selection[0],
                    "y": $scope.selection[1]
                };
                // Only does anything if config.saveAllocation is True
                rs.trigger("rp.perform_allocation", actualAllocation);

                return;
            }

        });
    });

    rs.on("rp.group1Finished", function () {
        $scope.group1Finished = true;
    });
    rs.recv("rp.group1Finished", function () {
        $scope.group1Finished = true;
    });

    rs.on("rp.group2Finished", function () {
        $scope.group2Finished = true;
    });
    rs.recv("rp.group2Finished", function () {
        $scope.group2Finished = true;
    });

    // Receive result (whether X or Y was chosen) from admin.
    rs.on("rp.result", function (result) {
        result.period = rs.period;
        rs.set("rp.results", result);

        if($scope.config.plotResult) {
            $scope.finalResult = result;
            rs.next_period($scope.config.delay);
        } else if (!$scope.config.TTMPeriod) {
            rs.next_period();
        }
    });

    $scope.$on("rpPlot.click", function (event, selection) {
        rs.trigger("rp.selection", selection);
    });

    $scope.confirm = function () {
        $scope.inputEnabled = false;
        rs.trigger("rp.confirm", {
            "round": $scope.currentRound,
            "x": $scope.selection[0],
            "y": $scope.selection[1]
        });
    };

}]);
