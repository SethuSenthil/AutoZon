M.AutoInit();

const mainListDB = 'autozonlist';

function addCollectionItem({ cardName, cardEnding, amountCharged = 0.5, repeatTimes = 1, delayTimeSeconds = 15, cardUUID }) {
    // Create the li element
    const li = document.createElement('li');
    const spanIconAndName = document.createElement('span');

    li.className = 'collection-item loaded-payment-method';
    li.setAttribute('style', 'display: flex; justify-content: space-between; align-items: center;');

    // Create the i element for the icon
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-credit-card';

     // Create the span element for the card ending
     const timesToRunSpan = document.createElement('span');
     timesToRunSpan.className = 'grey-text';
     timesToRunSpan.textContent = `(x${repeatTimes})`;

    // Create the span element for the card ending
    const span = document.createElement('span');
    span.className = 'grey-text text-darken-2';
    span.textContent = 'ending in ' + cardEnding;

    // Append the icon and card name to the li element
    spanIconAndName.appendChild(icon);
    spanIconAndName.appendChild(document.createTextNode(' ' + cardName + ' '));

    const deleteIcon = document.createElement('i');
    deleteIcon.className = 'fa-solid fa-trash red-text text-darken-2';

    deleteIcon.addEventListener('click', (e) => {
        const conformation = confirm(`Are you sure you want to delete this card (${cardEnding})?`);

        if (conformation) {
            chrome.storage.sync
                .get([mainListDB])
                .then(result => {
                    let existingList = result[mainListDB] ?? '[]';
                    existingList = JSON.parse(existingList);
                    const index = existingList.indexOf(cardUUID);
                    if (index > -1) {
                        existingList.splice(index, 1);
                    }
                    chrome.storage.sync
                        .set({
                            [mainListDB]: JSON.stringify(existingList),
                        })
                        .then(() => {
                            console.log('AutoZon is set db');
                            loadPaymentMethods();
                        }).catch(err => {
                            alert('Error: ' + err);
                        });
                })
                .catch(err => {
                    alert('Error: ' + err);
                });
        }
    });


    li.appendChild(spanIconAndName);
    li.appendChild(timesToRunSpan);
    li.appendChild(span);
    li.appendChild(deleteIcon);


    li.addEventListener('click', () => {

        const conformation = confirm(`Are you sure you want to reload your balance with this card (${cardEnding})? This will charge your card!`);

        if (conformation) {
            chrome.runtime.sendMessage(JSON.stringify({
                cardEnding: cardEnding,
                amountCharged: amountCharged,
                repeatTimes: repeatTimes,
                delayTimeSeconds: delayTimeSeconds,
                'PURCHASE_GIFT_CARD': true
            }));
        }

    });

    // Find the ul element with the class "collection"
    const ul = document.querySelector('.collection');

    // Append the li element to the ul element
    ul.appendChild(li);
}


function loadPaymentMethods() {
    //remove previous render
    const elements = document.querySelectorAll('.loaded-payment-method');
    elements.forEach((element) => {
        element.remove();
    });

    chrome.storage.sync
        .get([mainListDB])
        .then(result => {
            let list = result[mainListDB] ?? '[]';
            list = JSON.parse(list);

            list.forEach(cardUUID => {
                chrome.storage.sync
                    .get([cardUUID])
                    .then(result2 => {
                        const card = JSON.parse(result2[cardUUID]);
                        addCollectionItem({ cardName: card.cardFriendlyName, cardEnding: card.cardNumber, amountCharged: card.amountCharged, repeatTimes: card.repeatTimes, delayTimeSeconds: card.delayTimeSeconds, cardUUID: cardUUID});
                    });
            });
        }).catch(err => {
            alert('Error: ' + err);
        });
}
loadPaymentMethods();

const amountChargedInput = document.getElementById('amount_charged');


const totalCost = document.getElementById('total-cost');

const repeatTextInput = document.getElementById('repeat');
const delaySettingsDiv = document.getElementById('delay-settings');
const instance = M.Modal.getInstance(document.getElementById('modal1'));
const body = document.querySelector('body');

const triggerModal = document.getElementById('trigger-modal');

triggerModal.addEventListener('click', () => {
    body.style.width = '700px';
    body.style.height = '500px';
    instance.open();
});

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (
            c ^
            (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
    );
}

function handleAmountChargedInput() {
    const value = repeatTextInput.value;
    try {
        const numVal = parseInt(value);
        if (numVal > 1) {
            delaySettingsDiv.style.display = 'block';
        } else {
            delaySettingsDiv.style.display = 'none';
        }

        try {
            const amountCharged = Number(amountChargedInput.value);
            const totalCostCalc = amountCharged * numVal;
            totalCost.innerText = totalCostCalc;
        } catch (e) {
            console.log(e);
        }
    } catch (e) {
        console.log(e);
    }
}

repeatTextInput.addEventListener('change', () => {
    handleAmountChargedInput();
});

amountChargedInput.addEventListener('change', () => {
    handleAmountChargedInput();
});

const cardNumberInput = document.getElementById('card_number'); //should be last 4card number
const delayInput = document.getElementById('delay');
const cardFriendlyName = document.getElementById('card_name');


const submitButton = document.getElementById('save-new-card');
submitButton.addEventListener('click', () => {
    try {
        const repeatTimes = parseInt(repeatTextInput.value);
        try {
            let amountCharged = Number(amountChargedInput.value);
            amountCharged = amountCharged.toFixed(2);

            try {
                const cardNumber = parseInt(cardNumberInput.value);
                if (cardNumber.toString().length !== 4) {
                    alert('Please enter the last 4 digits of your card number.');
                } else {
                    try {
                        const delayTimeSeconds = parseInt(delayInput.value);

                        const uuid = uuidv4();

                        chrome.storage.sync
                            .set({
                                [uuid]: JSON.stringify({
                                    delayTimeSeconds: delayTimeSeconds,
                                    repeatTimes: repeatTimes,
                                    amountCharged: amountCharged,
                                    cardNumber: cardNumber,
                                    cardFriendlyName: cardFriendlyName.value ?? 'Unnamed Card',
                                }),
                            })
                            .then(() => {
                                console.log('AutoZon is set');

                                chrome.storage.sync
                                    .get([mainListDB])
                                    .then(result => {
                                        let existingList = result[mainListDB] ?? '[]';
                                        existingList = JSON.parse(existingList);
                                        existingList.push(uuid);
                                        chrome.storage.sync
                                            .set({
                                                [mainListDB]: JSON.stringify(existingList),
                                            })
                                            .then(() => {
                                                console.log('AutoZon is set db');
                                                loadPaymentMethods();
                                                instance.close();
                                                body.style.width = '500px';
                                                body.style.height = '300px';

                                            }).catch(err => {
                                                alert('Error: ' + err);
                                            });
                                    })
                                    .catch(err => {
                                        alert('Error: ' + err);
                                    });
                            });

                    } catch (e) {
                        alert('Please enter a valid delay time.');
                    }
                }
            } catch (e) {
                alert('Please enter the last 4 digits of your card number.');
            }
        } catch (e) {
            alert('Please enter a valid currency amount to charge.');
        }
    } catch (e) {
        alert('Please enter a valid number of times to repeat the charge.');
    }
});
