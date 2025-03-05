export const computeFullName = {
    dependencies: ['firstName', 'lastName'],
    functionDefinition: `@computed(['firstName', 'lastName'], (obj, firstName: string, lastName: string) => {
        if (firstName === '' || firstName == null) {
            return lastName;
        }
        return \`\${firstName} \${lastName}\`
    }, (obj, fullName: string) => {
        if (fullName == null) {
            return;
        }
        const {{classNameLower}} = obj as {{className}};
        const initialOverride = {{classNameLower}}.overrideSetFunctionality;
        {{classNameLower}}.overrideSetFunctionality = true;
        const nameParts = fullName.split(' ');
        const len = nameParts.length;

        if (len == 1) {
            {{classNameLower}}.firstName = nameParts[0];
            {{classNameLower}}.lastName = '';
        } else {
            {{classNameLower}}.firstName = nameParts.slice(0, len - 1).join(' '); // All words up to the last
            {{classNameLower}}.lastName = nameParts[len - 1];
        }

        {{classNameLower}}._loadedProperties.add('firstName');
        {{classNameLower}}._loadedProperties.add('lastName');

        {{classNameLower}}._dirty['firstName'] = {{classNameLower}}.firstName;
        {{classNameLower}}._dirty['lastName'] = {{classNameLower}}.lastName;
        {{classNameLower}}.overrideSetFunctionality = initialOverride;
    })`
}

export const computeFullNameContact = {

}