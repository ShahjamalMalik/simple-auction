//"StAuth10222: I Shahjamal Malik, 000367974 certify that this material is my original work. No other person's work has been used without due acknowledgement. I have not made my work available to anyone else."

document.addEventListener("DOMContentLoaded", () => {
    const socket = io('/bidder');
    const nameEntry = document.getElementById("nameEntry");
    const waitingMessage = document.getElementById("waitingMessage");
    const bidderNameInput = document.getElementById("bidderName");
    const submitNameButton = document.getElementById("submitNameButton");
    const nameErrorDiv = document.getElementById("nameError");
    const auctionWinnerMessage = document.getElementById("auctionWinnerMessage");


    // Element references for the bidding interface
    const biddingInterface = document.getElementById("biddingInterface");
    const itemNameSpan = document.getElementById("itemName");
    const currentHighestBidderSpan = document.getElementById("currentHighestBidder");
    const currentHighestBidSpan = document.getElementById("currentHighestBid");
    const timer = document.getElementById("timer");
    const bidPriceInput = document.getElementById("bidPrice");
    const submitButton = document.querySelector("#biddingForm button");

    let currentBidders;

    // Flag to track whether the name is already taken
    let nameTaken = false;

    // Listen for the form submission
    submitNameButton.addEventListener("click", () => {
        nameErrorDiv.style.display = "none";
        const bidderName = bidderNameInput.value;

        if (!bidderName) {
            alert("Please enter your name.");
        } else {
            // Emit a 'joinAuction' event with the bidder's name
            socket.emit('joinAuction', { type: 'bidder', name: bidderName });
            // Hide the name entry and show the waiting message
            nameEntry.style.display = "none";
            waitingMessage.style.display = "block";
        }
    });

    // Handle the "startAuction" event from the server
    socket.on("startAuction", (data) => {
        if(waitingMessage.style.display == "block") {
            bidPriceInput.disabled = false;
            submitButton.disabled = false;
    
            // Hide the waiting message
            waitingMessage.style.display = "none";
            auctionWinnerMessage.style.display = "none";
            auctionWinnerMessage.textContent = "";

            // Display auction details
            itemNameSpan.textContent = data.itemName;
            currentHighestBidderSpan.textContent = data.currentHighestBidder;
            currentHighestBidSpan.textContent = "$" + data.currentBid;
    
            // Show the bidding interface
            biddingInterface.style.display = 'block';
    
            // Display and start the timer
            timer.style.display = "block";
            let remainingTime = data.timeLimit;
            timer.textContent = `Time Remaining: ${remainingTime} seconds`;
    
            const timerInterval = setInterval(() => {
                remainingTime -= 1;
                timer.textContent = `Time Remaining: ${remainingTime} seconds`;
                if (remainingTime <= 0) {
                    clearInterval(timerInterval);
                    timer.textContent = "Auction Ended";
                    // Disable the bid submission form or hide the submit button
                    const bidPriceInput = document.getElementById("bidPrice");
                    const submitButton = document.querySelector("#biddingForm button");
                    bidPriceInput.disabled = true;
                    submitButton.disabled = true;
                }
            }, 1000);
        }
       
    });

    // Handle form submission for placing bids
    const biddingForm = document.getElementById("biddingForm");
    biddingForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const bidPrice = parseFloat(document.getElementById("bidPrice").value);

        // Add a validation check to ensure the bid is not higher than 1 billion
        if (isNaN(bidPrice) || bidPrice > 1000000000) {
            alert("Please enter a valid bid price less than or equal to 1 billion.");
            return;
        }
        // Emit a 'placeBid' event with the bid price
        socket.emit("placeBid", {
            type: "bidder",
            bidPrice: bidPrice,
            bidders: currentBidders, // Include the bidders array in the data
        });
    });

    // Modify the "placeBid" socket.on handler to provide feedback
    socket.on("placeBidResult", (data) => {
        if (data.bidResult === "tooLow") {
            // Display a message in red text indicating the bid is too low
            const message = "Bid too low";
            showMessage(message, "red");
        } else if (data.bidResult === "highestBid") {
            // Display a message in green text indicating they have the current highest bid
            const message = "You are the current highest bidder!";
            showMessage(message, "green");
        }
    });

    // Function to display messages with a given color
    function showMessage(message, color) {
        const messageElement = document.createElement("p");
        messageElement.textContent = message;
        messageElement.style.color = color;
        document.getElementById("biddingInterface").appendChild(messageElement);
        setTimeout(() => {
            messageElement.remove();
        }, 3000); // Automatically remove the message after 3 seconds
    }
    // Handle the "currentAuctionState" event from the server
    socket.on("currentAuctionState", (data) => {
        // Access the bidders array and log it or do other operations as needed
        currentBidders = data.bidders;
        // Update the UI with the current auction state
        itemNameSpan.textContent = data.itemName;
        currentHighestBidderSpan.textContent = data.currentHighestBidder;
        currentHighestBidSpan.textContent = "$" + data.currentBid;
        timer.textContent = `Time Remaining: ${data.timeLimit} seconds`;
    });

    socket.on('updateHighestBid', (data) => {
        currentHighestBidderSpan.textContent = data.currentHighestBidder;

        currentHighestBidSpan.textContent = "$" + data.currentBid;
    });

    // Handle the "updateRemainingTime" event from the server
    socket.on("updateRemainingTime", (remainingTime) => {
        // Update the remaining time on the bidder's page
        if (timer.textContent !== "Auction Ended") {
            timer.textContent = `Time Remaining: ${remainingTime} seconds`;
        }
    });

    // Handle the "auctionEnded" event from the server
    socket.on("auctionEnded", (data) => {
        if(data) {
            timer.textContent = "Auction Ended";
            // Disable the bid submission form or hide the submit button
            bidPriceInput.disabled = true;
            submitButton.disabled = true;
            // Hide the bidding interface
            biddingInterface.style.display = 'none';
            // Reset highestBid and numBids for all bidders
            resetBiddersData();
            // Show the "Waiting for auction" message
            waitingMessage.style.display = "block";
            auctionWinnerMessage.textContent = `${currentHighestBidderSpan.textContent} had the highest bid, with this amount: ${currentHighestBidSpan.textContent}`;
            auctionWinnerMessage.style.display = "block";
        } else {
            timer.textContent = "Auction Ended";
            // Disable the bid submission form or hide the submit button
            bidPriceInput.disabled = true;
            submitButton.disabled = true;
            // Hide the bidding interface
            biddingInterface.style.display = 'none';
            // Reset highestBid and numBids for all bidders
            resetBiddersData();
            // Show the "Waiting for auction" message
            waitingMessage.style.display = "block";
            auctionWinnerMessage.textContent = `Auctioneer had the highest bid, this probably means no one placed a bid. This was the starting amount: ${currentHighestBidSpan.textContent}`;
            auctionWinnerMessage.style.display = "block";
    
        }

    });
    // Function to reset highestBid and numBids for all bidders
    function resetBiddersData() {
        for (const bidder of currentBidders) {
            if(bidder !== undefined) {
                bidder.highestBid = 0;
                bidder.numBids = 0;
            }

        }
    }

    // Handle the "nameError" event from the server
    socket.on("nameError", () => {
        // Show the name error message
        nameErrorDiv.textContent = "Name is already taken. Please choose a different name.";
        nameErrorDiv.style.display = "block";
        bidderNameInput.value = '';
        bidderNameInput.style.display = "block";
        waitingMessage.style.display = "none";
        nameEntry.style.display = "block";
        // Set the nameTaken flag to true to indicate that the name is taken
    });
});
