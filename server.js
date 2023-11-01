//"StAuth10222: I Shahjamal Malik, 000367974 certify that this material is my original work. No other person's work has been used without due acknowledgement. I have not made my work available to anyone else."


const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const path = require('path');

const PORT = 3000;
let count = 0;
let bidderArr;
let addItemsLength;
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
let auctioneerSocket = null; // Initialize the auctioneer socket variable

// Create namespaces
const bidderNamespace = io.of('/bidder');
const auctioneerNamespace = io.of('/auctioneer');

// Define data structures to store auction and bidder information
const auction = {
    itemName: '',
    price: 0,
    timeLimit: 0,
    currentBid: 0,
    currentHighestBidder: 'auctioneer',
    bidsHistory: [],
    timer: null,
    bidders: [],
};

// Now, handle connections for each namespace
bidderNamespace.on('connection', (socket) => {
    // Handle bidder socket logic
    
    socket.on('joinAuction', (data) => {
        if (data.type === 'bidder') {
            // Check if the bidder name is already in use
            const nameInUse = auction.bidders.some((bidder) => bidder.name === data.name);

            if (nameInUse) {
                // Send an error message to the bidder
                socket.emit('nameError', { message: 'Name is already taken. Please choose a different name.' });
            } else {
                // Create an entry for the bidder in the bidders array
                const bidder = {
                    id: socket.id,
                    name: data.name,
                    highestBid: 0, // Initialize with 0
                    numBids: 0,    // Initialize with 0
                };
                auction.bidders.push(bidder);
                if(bidderArr) {
                    let isTrue = false;
                    bidderArr.forEach((element) => {
                        if(bidder.id == element.id || bidder.name.toLowerCase() == element.name.toLowerCase()) {
                            console.log("This is element: ")
                            console.log(element)
                            console.log("This is bidder: ")
                            console.log(bidder)
                            isTrue = true;
                        }
                    })
                    if(isTrue != true) {
                        bidderArr.push(bidder)
                    } else {
                        socket.emit('nameError', { message: 'Name is already taken. Please choose a different name.' });
                    }
                }
                //console.log("This is bidderArr")
                //console.log(bidderArr)   

                // Send the current auction state to the bidder
                socket.emit('currentAuctionState', {
                    itemName: auction.itemName,
                    currentHighestBidder: auction.currentHighestBidder,
                    currentBid: auction.currentBid,
                    timeLimit: auction.timeLimit,
                    bidders: auction.bidders
                });

                // Emit a 'startAuction' event for the new bidder
                if (auctioneerSocket) {
                    auctioneerSocket.emit('startAuction', {
                        itemName: auction.itemName,
                        currentHighestBidder: auction.currentHighestBidder,
                        currentBid: auction.currentBid,
                        timeLimit: auction.timeLimit,
                    });
                } else {
                    console.log('No auctioneer available');
                }
            }
        }
    });

    socket.on('placeBid', (data) => {
        
        count += 1;

        //console.log("this is data.bidders")
        //console.log(data.bidders);
        if(bidderArr) {
            for (let i = 0; i < bidderArr.length; i++) {
                if ( bidderArr[i] == undefined ) {
                    console.log("This is undefined")
                    bidderArr.splice(i, 1);
                    console.log(bidderArr);
                }
                
            }
        }

        if(count === 1) {
            bidderArr = data.bidders;
        }
        if(bidderArr.length < data.bidders.length) {
            addItemsLength = data.bidders.length - bidderArr.length
            for(let i = bidderArr.length; i <= addItemsLength; i++) {
                bidderArr.push(data.bidders[i])
            }
        }
        if (data.type === 'bidder') {
            // Update auction state and send updated data to bidders
            const bidder = bidderArr.find((bidder) => bidder.id === socket.id);
            if (bidder) {
                if (parseInt(data.bidPrice) > parseInt(auction.currentBid)) {
                    // Update the bidder's highest bid and numBids
                    bidder.highestBid = data.bidPrice;
                    bidder.numBids += 1;
                    // Update the rest of your auction state as needed
                    auction.bidsHistory.unshift({ id: socket.id, bidPrice: data.bidPrice, name: bidder.name });
                    auction.currentBid = data.bidPrice;
                    auction.currentHighestBidder = bidder.name;
                    // Notify all bidders about the new highest bid
                    bidderNamespace.emit('updateHighestBid', {
                        itemName: auction.itemName,
                        currentHighestBidder: bidder.name,
                        currentBid: data.bidPrice,
                        timeLimit: auction.timeLimit,
                    });

                    // Set the threshold as the current highest bid
                    const threshold = auction.currentBid;
                    // Check if the bid is too low (below the threshold)
                    if (parseInt(data.bidPrice) > parseInt(auction.price)) {
                    // If the bid is greater than the threshold (initial price), emit "placeBidResult" with "highestBid"
                    socket.emit('placeBidResult', { bidResult: 'highestBid' });
                    }
                }
                else {

                    // If the bid is too low, emit "placeBidResult" with "tooLow"
                    socket.emit('placeBidResult', { bidResult: 'tooLow' });
                }
                // Update total number of bids
                const totalBids = auction.bidsHistory.length;

                // Emit updates to the auctioneer
                auctioneerNamespace.emit('updateAuction', {
                    currentHighestBidder: auction.currentHighestBidder,
                    currentBid: auction.currentBid,
                    bidders: bidderArr,
                    bidHistory: auction.bidsHistory,
                    totalBids
                    
                });
            }
        }
    });

    socket.on('disconnect', () => {
        if(bidderArr) {
            for (let i = 0; i < bidderArr.length; i++) {
                if (socket.id === bidderArr[i].id) {
                    console.log(`This is socket id: ${socket.id} and this is bidderArr[i].id: ${bidderArr[i].id}`)
                    bidderArr.splice(i, 1);
                    console.log(bidderArr)
                    break;  // Exit the loop once the bidder is found and removed
                }
                
            }
            for (let i = 0; i < bidderArr.length; i++) {
                if ( bidderArr[i] == undefined ) {
                    console.log("This is undefined")
                    bidderArr.splice(i, 1);
                    console.log(bidderArr);
                }
                
            }
        }

    });
});

auctioneerNamespace.on('connection', (socket) => {

    auctioneerSocket = socket;

    // Handle auctioneer socket logic
    socket.on('startAuction', (data) => {
        // Handle starting a new auction (typically done by the auctioneer)
        if (data.type === 'auctioneer') {
            startNewAuction(data.itemName, data.price, data.timeLimit);
        }
    });

    socket.on('disconnect', () => {
        // Reset the auctioneer socket if it disconnects
        auctioneerSocket = null;
    });
});

// Serve the client-side HTML for auctioneer and bidder
app.get('/auctioneer', (req, res) => {
    res.sendFile(__dirname + '/public/auctioneer.html');
});

app.get('/bidder', (req, res) => {
    res.sendFile(__dirname + '/public/bidder.html');
});

// Function to start a new auction
function startNewAuction(itemName, price, timeLimit) {
    auction.itemName = itemName;
    auction.price = price;
    auction.timeLimit = timeLimit;
    auction.currentBid = price;
    auction.currentHighestBidder = 'auctioneer';
    auction.bidders = [];
    auction.bidsHistory = [];

    // Emit a 'startAuction' event to all connected bidders with auction details
    bidderNamespace.emit('startAuction', {
        itemName,
        currentHighestBidder: 'auctioneer',
        currentBid: price,
        timeLimit,
    });
    // Show the results section and update the auction details
    auctioneerNamespace.emit('showResults', {
        currentHighestBidder: "Auctioneer",
        currentBid: price,
        totalBids: 0 // Initialize with 0, this will be updated as bids come in
    });
    

    // Start the timer
    if (auction.timer) {
        clearInterval(auction.timer);
    }
    auction.timer = setInterval(() => {
        // Notify bidders of remaining time (send remaining time to all bidders)
        bidderNamespace.emit('updateRemainingTime', auction.timeLimit);

        // Check if the timer has reached zero and end the auction
        if (auction.timeLimit === 0) {
            clearInterval(auction.timer);
            // Notify bidders that the auction has ended
            if(bidderArr) {
                bidderNamespace.emit('auctionEnded', bidderArr);
            } else {
                bidderNamespace.emit('auctionEnded');
            }
            

            function resetBiddersData() {


                for (const bidder of bidderArr) {
                    if(bidder !== undefined) {
                        bidder.highestBid = 0;
                        bidder.numBids = 0;
                    }
                }
            }
            if(bidderArr) {
                resetBiddersData();
            }

            
        } else {
            auction.timeLimit--;
        }
    }, 1000);
}

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
