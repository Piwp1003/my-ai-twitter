package android.app.usage;
public class UsageEvents { public boolean hasNextEvent(){return false;} public boolean getNextEvent(Event e){return false;}
 public static class Event { public Event(){} public String getPackageName(){return null;} public long getTimeStamp(){return 0;} public int getEventType(){return 0;} } }