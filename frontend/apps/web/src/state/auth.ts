// const userData = atom<User>({
//     key: "userData",
//     default: selector({
//         key: "userData/default",
//         get: async ({ get }) => {
//             try {
//                 return await api.fetchProfile();
//             } catch (err) {
//                 return null;
//             }
//         },
//     }),
//     // effects: [
//     //     ({ setSelf, trigger }) => {
//     //         console.log(api.accessToken);
//     //         const userID = getUserIDFromToken();
//     //         if (userID !== null) {
//     //             ws.subscribe("user", userID, (subscriptionType, { subscription_type, element_id }) => {
//     //                 if (subscription_type === "user" && element_id === userID) {
//     //                     api.fetchProfile().then((result) => {
//     //                         setSelf(result);
//     //                     });
//     //                 }
//     //             });
//     //             // TODO: handle registration errors

//     //             return () => {
//     //                 ws.unsubscribe("user", userID);
//     //             };
//     //         }
//     //         return null;
//     //     },
//     // ],
// });
