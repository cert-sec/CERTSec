
export const downloadObjectAsJson = (exportObj: any, exportName: string) => {
    const fileData = JSON.stringify(exportObj, null, 4);
    const blob = new Blob([fileData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${exportName}.json`;
    link.href = url;

    // Append the link to the DOM
    document.body.appendChild(link);

    // Simulate a click to download the file
    link.click();

    // Clean up by removing the link and revoking the object URL
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}