document.getElementById('num-subnets').addEventListener('change', updateSubnetInputs);
document.getElementById('subnet-type').addEventListener('change', toggleSubnetType);

function toggleSubnetType() {
    const type = document.getElementById('subnet-type').value;
    const variableInputs = document.getElementById('variable-mask-inputs');
    const fixedInputs = document.getElementById('fixed-mask-inputs');

    if (type === 'variable') {
        variableInputs.style.display = 'block';
        fixedInputs.style.display = 'none';
    } else {
        variableInputs.style.display = 'none';
        fixedInputs.style.display = 'block';
    }
}

function updateSubnetInputs() {
    const numSubnets = parseInt(document.getElementById('num-subnets').value);
    const container = document.getElementById('subnet-hosts-inputs');
    container.innerHTML = '';

    for (let i = 0; i < numSubnets; i++) {
        const div = document.createElement('div');
        div.className = 'input-group';
        div.innerHTML = `
            <label for="subnet-${i}">Numero di host per la sottorete ${i + 1}:</label>
            <input type="number" id="subnet-${i}" min="1" value="1">
        `;
        container.appendChild(div);
    }
}

function validateIPAddress(address) {
    const regex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!regex.test(address)) return false;

    const parts = address.split('/');
    const octets = parts[0].split('.');
    const cidr = parseInt(parts[1]);

    if (cidr < 0 || cidr > 32) return false;

    return octets.every(octet => {
        const num = parseInt(octet);
        return num >= 0 && num <= 255;
    });
}

function calculateSubnets() {
    const networkAddress = document.getElementById('network').value;
    if (!validateIPAddress(networkAddress)) {
        alert('Inserisci un indirizzo di rete valido');
        return;
    }

    const subnetType = document.getElementById('subnet-type').value;

    if (subnetType === 'fixed') {
        calculateFixedSubnets(networkAddress);
    } else {
        calculateVariableSubnets(networkAddress);
    }
}

function calculateFixedSubnets(networkAddress) {
    const fixedMask = parseInt(document.getElementById('fixed-subnet-mask').value);
    const [network, originalPrefix] = networkAddress.split('/');
    
    if (fixedMask < parseInt(originalPrefix)) {
        alert('La maschera fissa deve essere maggiore della maschera di rete originale');
        return;
    }

    try {
        const subnetResults = document.querySelector('#subnet-results .results-content');
        subnetResults.innerHTML = '';
        
        const numPossibleSubnets = Math.pow(2, fixedMask - parseInt(originalPrefix));
        let currentAddress = network;

        for (let i = 0; i < numPossibleSubnets; i++) {
            const subnet = calculateSubnetDetails(currentAddress, fixedMask);
            
            const subnetDiv = document.createElement('div');
            subnetDiv.className = 'subnet-item';
            subnetDiv.innerHTML = `
                <h3>Sottorete ${i + 1}</h3>
                <p>Rete: ${subnet.network}/${fixedMask}</p>
                <p>Gateway: ${subnet.gateway}</p>
                <p>Broadcast: ${subnet.broadcast}</p>
                <p>Host Disponibili: ${Math.pow(2, 32-fixedMask) - 2}</p>
            `;
            
            subnetResults.appendChild(subnetDiv);
            currentAddress = incrementIP(subnet.broadcast);
        }

        // Clear link results for fixed subnet calculation
        document.querySelector('#link-results .results-content').innerHTML = '';
    } catch (error) {
        alert('Errore nel calcolo delle sottoreti: ' + error.message);
    }
}

function calculateVariableSubnets(networkAddress) {
    const numSubnets = parseInt(document.getElementById('num-subnets').value);
    const numLinks = parseInt(document.getElementById('num-links').value);
    
    const subnets = [];
    for (let i = 0; i < numSubnets; i++) {
        subnets.push(parseInt(document.getElementById(`subnet-${i}`).value));
    }

    try {
        const [network, prefix] = networkAddress.split('/');
        let currentAddress = network;
        
        const subnetResults = document.querySelector('#subnet-results .results-content');
        subnetResults.innerHTML = '';
        
        subnets.forEach((hosts, index) => {
            const requiredBits = Math.ceil(Math.log2(hosts + 2));
            const subnetPrefix = 32 - requiredBits;
            
            const subnet = calculateSubnetDetails(currentAddress, subnetPrefix);
            
            const subnetDiv = document.createElement('div');
            subnetDiv.className = 'subnet-item';
            subnetDiv.innerHTML = `
                <h3>Sottorete ${index + 1}</h3>
                <p>Rete: ${subnet.network}/${subnetPrefix}</p>
                <p>Host Richiesti: ${hosts}</p>
                <p>Gateway: ${subnet.gateway}</p>
                <p>Broadcast: ${subnet.broadcast}</p>
            `;
            
            subnetResults.appendChild(subnetDiv);
            currentAddress = incrementIP(subnet.broadcast);
        });

        const linkResults = document.querySelector('#link-results .results-content');
        linkResults.innerHTML = '';
        
        for (let i = 0; i < numLinks; i++) {
            const subnet = calculateSubnetDetails(currentAddress, 30);
            
            const linkDiv = document.createElement('div');
            linkDiv.className = 'link-item';
            linkDiv.innerHTML = `
                <h3>Collegamento ${i + 1}</h3>
                <p>Rete: ${subnet.network}/30</p>
                <p>Host 1: ${subnet.firstHost}</p>
                <p>Host 2: ${subnet.secondHost}</p>
                <p>Broadcast: ${subnet.broadcast}</p>
            `;
            
            linkResults.appendChild(linkDiv);
            currentAddress = incrementIP(subnet.broadcast);
        }
    } catch (error) {
        alert('Errore nel calcolo delle sottoreti: ' + error.message);
    }
}

function calculateSubnetDetails(networkAddress, prefix) {
    const octets = networkAddress.split('.');
    const numericIP = (parseInt(octets[0]) << 24) + 
                     (parseInt(octets[1]) << 16) + 
                     (parseInt(octets[2]) << 8) + 
                     parseInt(octets[3]);
    
    const mask = ~((1 << (32 - prefix)) - 1);
    const network = numericIP & mask;
    const broadcast = network | ~mask;
    const gateway = broadcast - 1;
    const firstHost = network + 1;
    const secondHost = network + 2;

    return {
        network: numToIP(network),
        gateway: numToIP(gateway),
        broadcast: numToIP(broadcast),
        firstHost: numToIP(firstHost),
        secondHost: numToIP(secondHost)
    };
}

function numToIP(num) {
    return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255
    ].join('.');
}

function incrementIP(ip) {
    const octets = ip.split('.');
    let num = (parseInt(octets[0]) << 24) + 
              (parseInt(octets[1]) << 16) + 
              (parseInt(octets[2]) << 8) + 
              parseInt(octets[3]);
    num++;
    return numToIP(num);
}

// Initialize subnet inputs
updateSubnetInputs();