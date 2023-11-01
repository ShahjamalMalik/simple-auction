//"StAuth10222: I Shahjamal Malik, 000367974 certify that this material is my original work. No other person's work has been used without due acknowledgement. I have not made my work available to anyone else."

document.addEventListener("DOMContentLoaded", () => {
  const socket = io('/auctioneer');
  const auctioneerForm = document.getElementById("auctioneerForm");
  const startAuctionButton = document.getElementById("startAuctionButton");
  const newAuctionButton = document.getElementById("newAuctionButton");
  const timeLimitRange = document.getElementById("timeLimit");
  const timeValue = document.getElementById("timeValue");
  const timerDisplay = document.getElementById("timerDisplay");
  const bidderTableBody = document.getElementById("bidderTableBody");
  const bidHistoryTableBody = document.getElementById("bidHistoryTableBody");

  let countdownInterval;
  let remainingTime = 0;

  // Register the input event listener to update the selected time
  timeLimitRange.addEventListener("input", () => {
    timeValue.textContent = timeLimitRange.value;
  });
  socket.on("showResults", (data) => {
    // Show the results section
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('highestBid').textContent = data.currentBid;
    document.getElementById('highestBidder').textContent = data.currentHighestBidder;
    document.getElementById('totalBids').textContent = data.totalBids;
  })
  socket.on("updateAuction", (data) => {
    document.getElementById('highestBid').textContent = data.currentBid;
    document.getElementById('highestBidder').textContent = data.currentHighestBidder;
    document.getElementById('totalBids').textContent = data.totalBids;
    // Update bidder table (data.bidders is an array of bidders)
    bidderTableBody.innerHTML = ""; // Clear existing rows
    data.bidders.forEach((bidder) => {
      if(bidder !== undefined) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${bidder.name}</td>
          <td>${bidder.highestBid}</td>
          <td>${bidder.numBids}</td>
        `;
        bidderTableBody.appendChild(row);
      }

    });

    // Update bid history (data.bidHistory is an array of bid history items)
    bidHistoryTableBody.innerHTML = ""; // Clear existing rows
    for(let i = data.bidHistory.length - 1; i >= 0; i--) {
      if(data.bidHistory !== undefined) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${data.bidHistory[i].name}</td>
          <td>${data.bidHistory[i].bidPrice}</td>
        `;
        bidHistoryTableBody.appendChild(row);
      }
    }
  })
  
  // Handle form submission when the auctioneer clicks "Start Auction"
  auctioneerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    // Get form values
    const itemName = document.getElementById("itemName").value;
    const price = parseFloat(document.getElementById("price").value);
    const timeLimit = parseInt(timeLimitRange.value);

    // Basic validation
    if (!itemName || isNaN(price) || price <= 0) {
      alert("Please enter a valid item name and price.");
      return;
    }

    // Emit a 'joinAuction' event with the type: bidder for debugging
    socket.emit("joinAuction", { itemName, price, timeLimit, type: 'auctioneer' });

    // Emit a 'startAuction' event with the auction details
    socket.emit("startAuction", { itemName, price, timeLimit, type: 'auctioneer' });

    // Disable the form and start button during the auction
    auctioneerForm.style.display = "none";
    startAuctionButton.style.display = "none";

    // Show and start the timer
    timerDisplay.style.display = "block";
    remainingTime = timeLimit;
    updateTimerDisplay();
    countdownInterval = setInterval(updateTimerDisplay, 1000);
  });

  // Handle the "Start New Auction" button click
  newAuctionButton.addEventListener("click", () => {
    // Clear the form fields
    document.getElementById("itemName").value = "";
    document.getElementById("price").value = "";
    document.getElementById("timeLimit").value = "10"; // Set it back to the default value
    document.getElementById("timeValue").textContent = "10"; // Update the displayed selected time
    // Show the form and start button for a new auction
    auctioneerForm.style.display = "block";
    startAuctionButton.style.display = "block";

    // Hide the timer and "Start New Auction" button
    timerDisplay.style.display = "none";
    newAuctionButton.style.display = "none";

    // Clear the timer interval
    clearInterval(countdownInterval);
  });

  // Function to update and display the timer
  function updateTimerDisplay() {
    if (remainingTime > 0) {
      remainingTime--;
      timerDisplay.textContent = `Time Left: ${remainingTime} seconds`;
    } else {
      // Auction ended, allow the auctioneer to start a new one
      clearInterval(countdownInterval);
      timerDisplay.textContent = "Auction Ended";
      newAuctionButton.style.display = "block";
      bidderTableBody.innerHTML = ""; // Clear existing rows
      bidHistoryTableBody.innerHTML = ""; // Clear existing rows
      document.getElementById('resultsSection').style.display = 'none';
    }
  }
});
