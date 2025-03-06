// import Neode from "neode";
//
// const Contact: Neode.SchemaObject = {
//     guid: {
//         type: 'string',
//         primary: true
//     },
//     fullName: {
//         type: 'string',
//         required: true
//     },
//     type: {
//         type: 'string',
//         required: true
//     },
//     related_to: {
//         type: 'relationships',
//         target: 'contact',
//         relationship: 'RELATED_TO',
//         direction: 'out',
//         eager: false,
//         properties: {
//             // Relationship type
//             type: 'string',
//             established: 'datetime',
//
//             // Like a description kind of thing
//             notes: 'string'
//         }
//     }
// }
//
// export default Contact;