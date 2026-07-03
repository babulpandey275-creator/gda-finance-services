const q = query(
    collection(db, "collections"),
    where("customerId", "==", id)
);

const historySnap = await getDocs(q);

const history = [];

historySnap.forEach((docSnap) => {
    history.push(docSnap.data());
});

history.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return b.date.seconds - a.date.seconds;
});

historyTable.innerHTML = "";

history.forEach((h) => {

    const amount = Number(h.amount || 0);
    total += amount;

    const date = h.date
        ? new Date(h.date.seconds * 1000).toLocaleDateString()
        : "-";

    historyTable.innerHTML += `
    <tr>
        <td>${sr++}</td>
        <td>${date}</td>
        <td>₹${amount}</td>
    </tr>
    `;

    whatsappMessage += `${date} - ₹${amount}\n`;
});
