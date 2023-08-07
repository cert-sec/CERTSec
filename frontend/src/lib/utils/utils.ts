export const generateIdForOpenPort = (ip: string, port: string) => {
    const numericalIp = ip.split(".").join("");
    const paddedPort = port.padStart(5, "0");

    // cast to int using base 10
    return parseInt(numericalIp + paddedPort, 10);
}