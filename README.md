# redwood-revealed-preferences
Arrow securities risk elicitation experiment.


####Tatonnement
The tatonnement algorithm is outlined in 
Dropbox/Edgeworks 2013/ChoiceAndTatonnement/ in [Design.pdf](https://www.dropbox.com/s/r0izezd1btl60r6/Design.pdf?dl=0)
and [FinalTatDesign.pdf](https://www.dropbox.com/s/wcudmv2zblpswya/FinalTatDesign.pdf?dl=0).


####Default Configuration Parameters
######Endowment, Price and Probability Options
-  Ex                      : 0,
-  Ey                      : 0,
-  Price                   : 1,
-  ProbX                   : 0.5,
-  useDefaultSelection     : false

######Visual Options
-  XLimit                  : 100,
-  YLimit                  : 100,
-  labelX                  : "X",
-  labelY                  : "Y",
-  limitAnimDuration       : 0,
-  plotResult              : true,
-  showEndowment           : true,
-  showTable               : false,
-  showMaxPayouts          : true

######Interaction Options
-  constraintsX            : false

######Timing Options
-  rounds                  : 1,
-  delay                   : 5,
-  timeLimit               : 0,
-  pause                   : false,

######Tatonnement Options
-  epsilon1                : 1,  -- TTM will end after `roundsUnderEpsilon` rounds with (excess demand under `epsilon1`) OR
-  epsilon2                : 2,  -- (excess demand under `epsilon2` and prices off the grid)
-  roundsUnderEpsilon      : 2,
-  expectedExcess          : 13.5, -- `ez` in *Tatonnement Algorithm*
-  priceLowerBound         : 0.01,
-  priceUpperBound         : 100.0,
-  maxAngularDiff          : 0.26175,
-  marketMaker             : true, -- `mm` in *TA*
-  snapPriceToGrid         : true, -- `g` in *TA*
-  priceGrid               : [0.2, 0.28, 0.36, 0.43, 0.5, 0.57, 0.64, 0.7, 0.76, 0.83, 0.89, 0.94,
							  1, 10.6, 1.13, 1.21, 1.31, 1.43, 1.57, 1.75, 2, 2.33, 3.57, 5],
-  weightVector            : [0.1745, 0.08725, 0.043625, 0.0218125, 0.01090625],
-  TTMPeriod			   : false, -- True for all TTM Periods
-  firstMarkets			   : true, -- True for first TTM Period
-  seller				   : true, -- True for all "sellers" in market
-  saveAllocation          : false   -- True for all periods whose decisions should be used to determine TTM prices