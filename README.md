# Wheel Of Twilio Game

This project is Twilio's innovative booth activation designed to motivate people to engage with Twilio's technology while offering them the opportunity to win exciting prizes.

![Screenshot of the game](./resources/wheel.png)

## Prerequisites

- Ensure you have [pnpm](https://pnpm.io/) installed.
- A Twilio account. Sign up [here](https://www.twilio.com/try-twilio) if you don't have one.

## Getting Started

1. **Clone the project repository:**

   ```bash
   git clone https://github.com/your-repo/wheel-of-fortune.git
   cd wheel-of-fortune
   ```

2. **Set up Twilio Services:**

   - Go to the [Twilio Console](https://www.twilio.com/console).
   - Create the following services and save the service SIDs:
     - A [Sync Service](https://twilio.com/console/sync).
     - A [Verify Service](https://twilio.com/console/verify) with the [Email channel enabled](https://www.twilio.com/docs/verify/email). You can use a template similar to the one in [resources/sendgridTemplate.html](resources/sendgridTemplate.html).
     - A [Messaging Service](https://twilio.com/console/messaging) with the correct WhatsApp sender configured. Also, ensure that the messaging service is configured to handle incoming SMS messages.
     - Add an SMS sender to the Twilio Messaging Service to support SMS messages.

3. **Configure Environment Variables:**

   - Rename `sample.env` to `.env.local`.
   - Add the required service SIDs and other variables in the `.env.local` file:

     ```env
     TWILIO_ACCOUNT_SID="ACxxxxx"
     TWILIO_API_KEY="SKxxxxx"
     TWILIO_API_SECRET="xxxxx"
     EVENT_NAME="DevEvent 2024"
     NEXT_PUBLIC_WEDGES="San Francisco,London,Paris,Madrid,Berlin,New York,Munich,Barcelona,Amsterdam,Vienna"
     NEXT_PUBLIC_TWILIO_PHONE_NUMBER="+4918601860"
     MAX_BETS_PER_USER="0"
     VERIFY_SERVICE_SID="VAxxxxxxx"
     SYNC_SERVICE_SID="ISxxxxxx"
     MESSAGING_SERVICE_SID="MGxxxxxxx"
     BASIC_AUTH_USERNAME="twilio"
     BASIC_AUTH_PASSWORD="admin!"
     OFFERED_PRIZES="big"
     DISABLE_LEAD_COLLECTION="false"
     SEGMENT_SPACE_ID="your_segment_space_id"
     SEGMENT_PROFILE_KEY="your_segment_profile_key"
     SEGMENT_TRAIT_CHECK="your_segment_trait_check"
     ```

     > The flag `OFFERED_PRIZES` influences the message the winners get. If set the `small`, winners who bet on the right field are informed that they won and can collect a small prize at the Twilio booth. If set to `big`, they are notified that they qualified for a larger prize. You can also set the value to `both`, so winners can pick up a small prize and are qualified for the raffle prize at the same time.
     > The option `MAX_BETS_PER_USER` limits how often one user can submit a bet. If 0, the users can enter as many bets as they want.

4. **Run the setup script:**

   ```bash
   pnpm run setup
   ```

5. **Run ngrok**

   ```bash
   ngrok http 3000
   ```

   Copy the public URL and use it in the **Integration** section of the messaging service you created above `<URL>/api/incoming` for both WhatsApp and SMS.

6. **Start the application locally:**
   ```bash
   pnpm dev
   ```

After following these steps, the Wheel Of Twilio game should be up and running on your local machine. Enjoy testing and experimenting with Twilio's tech in a fun, interactive way!

If you encounter any issues or have questions, please refer to the issues section or open a new issue in the repository for assistance.

## Optional

## Optional Setup

### When Going on Breaks

Consider using a "Be Right Back" (BRB) screen to indicate that you are on a break. This can help communicate to others that you will return shortly.

The `/brb` endpoint can be accessed with a query parameter `kind`. If set to `end`, it will show a message that the game has ended and no more bets are accepted. If set to `break`, it shows a different message but still accepts bets. You can reset the flags with `kind=running`.

### Tips for production

Here are a few helpful notes:

- If you are using the SMS channel, make sure to [set the SMS Geo Permissions](https://www.twilio.com/docs/messaging/guides/sms-geo-permissions)to make sure senders from the entire world can interact with the Mixologist.
- Edit the [opt-out management settings](https://help.twilio.com/articles/360034798533-Getting-Started-with-Advanced-Opt-Out-for-Messaging-Services) of the messaging service to avoid that users accidentally unsubscribe from the list.
- Users can send the command "forget me" to remove all data stored about this user. It cancels pending orders, removes the user from the Sync data store and removes the Conversation resource. This can be used for debugging as well as to be GDPR-compliant.

### Feature Flag for Lead Collection

Lead collection can be controlled using the `DISABLE_LEAD_COLLECTION` feature flag in the `.env.local` file. By default, it is set to `false`, meaning lead collection is enabled. If you want to disable lead collection, set the flag to `true` in the `.env.local` file:

```env
DISABLE_LEAD_COLLECTION="true"
```

You can download the lead information by running the following script

```bash
pnpm download
```

### Segment Integration

This project includes an optional integration with Segment's Profiles API. If you provide the `SEGMENT_SPACE_ID` and `SEGMENT_PROFILE_KEY` environment variables, the application will fetch user traits from Segment using the provided email address once the verification step is completed. The `SEGMENT_TRAIT_CHECK` environment variable allows you to specify a specific trait to check for in the user's profile.

To set up Segment integration:

1. **Create a Segment account** if you don't have one. Sign up [here](https://segment.com/).

2. **Create a Segment Space** and obtain your `SEGMENT_SPACE_ID`.

3. **Generate a Segment Profile API Key** and obtain your `SEGMENT_PROFILE_KEY`.

4. **Specify a Trait to Check** by setting the `SEGMENT_TRAIT_CHECK` environment variable to the desired trait key.

For more details on Segment and how to use the Profiles API, refer to the [Segment documentation](https://segment.com/docs/).

### Display Considerations

Monitor resolution may cause the wheel and fields to appear too small or too large, potentially overlapping with background graphics. To mitigate this, please use your browser's zoom functionality and view the landing page in full-screen mode for optimal display.

---

## Contributing

We welcome contributions! Please fork the repository

Here are some ideas for possible features to be added:

- Add Branded Calling so that conference attendees are not surprised by an unknown call (the winner notification)
