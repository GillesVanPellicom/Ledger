# Versie 1
## Stijl
- brand auto caps in settings
- expense edit unit price 0
- expense data tabel payment method info 
- expense data tabel empty note dash

## Technisch
- bij het verwijderen van payment method, tussen haakjes oude payment method toevoegen bij de expenses
- brand required weg
- size required weg
- unit required weg
## Features
- concept expense form state save
- save and select bij product add modal
- expense total korting


# Versie 2
## Stijl
- shares value niet visible in dark mode

## Technisch
- bij payment method, name kan niet worden toegevoed, blijft leeg
- bij assign item debtors, size niet gegeven:
	- geef hier de totale qty als dropdown
	- wanneer qty daalt onder het totaal, automatish creeer een nieuwe entry van hetzelfde product onder het originele zodat een nieuwe debtor het overige kan betalen
	- voorbeel 10 pakken suiker iemand betaald 2, andere de rest. 
	- hou rekening met wat er gebeurt bij meer dan 2 debtors
	- hou rekening met de ease of use wanneer de qty meer dan 10 is
	- add/remove arrow box kan ook maar dan wordt gedrag moeilijk te programeren bij meer dan 2 debtors dus ik vermoed best dropdown tot 10 en bij meer, dropdown met scrolbar en een manueel getal entry box  
- enforce capitalization schakelt capital uit niet aan
- enforce capitalization ook inschakelen voor store/brand/debtor/text inputs
- bij het bewaren van de concept:
	- bewaar elk concept als nieuwe expense met mogelijks incomplete data 
	- voor concept gebruik een ander warning symbol
	- zorg ervoor dat meerdere concept expenses tegelijk kunnen bestaan
	- de kosten opgegeven in de concept expenses worden niet meegerekend
- bij ### Assign Items to Debtors, items per page doesnt work
- 
## Features
- bij payment method, inplaats van top ups die kunnen worden toegevoegd veervangen door: 
	- een transfer button
	- kan overboeken naar andere payment methods
	- bij overboeking komt gaat dit van de huidige payment en komt in de log te staan 
	- bij overboeking komt dit automatisch bij de ander payment method te staan in de log
	- een overboeking kan ook naar een entity

- bij create new expense, payment method, standaard preferred payment method selected
- bij create new expense, debt managed, standaard preferred debtor selected
- bij create new expense, items, qty up/down arrow to add and remove qty
- bij create new expense, items, items kunnen verschuiven van order
- standard items per page changeable in settings