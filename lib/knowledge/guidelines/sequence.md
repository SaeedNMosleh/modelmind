# Sequence Diagram Guidelines

## Theme 
Always use below line as second line of code: 
!include https://gitlab.com/saeed.najafi.pl/plantuml_themes/-/raw/d4b848abdef7605d31c315630f596a490e1e066c/Templates/Nokia_L3_v1.0.plantuml

Below items are defined in the included file and shall be used in sequence diagrams:

## Colors
!define NOKIA_LIGHT_BLUE #00C9FF
!define NOKIA_GREEN #4BDD33
!define NOKIA_ORANGE #FF8B10
!define NOKIA_RED #FF3154
!define DEFAULT_COLOR #000000

## Modification of Messages
- The messages in initial diagram that have solid type should use normal plantuml syntax without colors. like <entity1> -> <entity2> : Message
- New messages should be added to the existing diagram with this command : $message(Entity_1,Entity_2,Message, <optional> Color)
    - Messages always must have only two participants or entities.
- Color should be one of the defined colors in the theme other than DEFAULT_COLOR
- If message style should be set use the following command: $message(Entity_1,Entity_2,Message, <optional> Color, <optional> Style)
    - Style should be one of the predefined styles in the theme : Solid , dashed
    - If style is set, Color must be filled. If color is not determined, user DEFAULT_COLOR.
    - If message is alrady existed with non DEFAULT_COLOR, only add <style> to the existing message. 
- If user asked to add a new box like alt,opt,par,loop, group user below style and chose a color from the theme for box and messages within box. Do not miss changing color of messages within the box.
    $setGroupColor(<color>)
    opt or alt or par or loop or group
      here messages should use this template with same color used in $setGroupColor : $message(Entity_1,Entity_2,Message, <optional> Color) 
    end
    $revertGroupColor()
- If user asked to add a new message within the box, use the following command, color should be same as in $setGroupColor
    $message(Entity_1,Entity_2,Message, <optional> Color)
- If box is created for existing messages, use the following command to update their colors , color should be same as in $setGroupColor
    $message(Entity_1,Entity_2,Message, <color>)
- if box is created in intial messages do not use $setGroupColor

- Never use direct labels for control flow boxes (opt, alt, loop, par). Instead, use the $condition() command whenever a label is required:
    
    **Syntax**: `$condition(entity, message, <optional> color)`
    
    **Rules**:
    - **entity**: Must be the first participant covered by the box from left side
    - **message**: The condition or description text
    - **color**: Optional. If not specified, omit this parameter entirely
    - **color**: If the box was created with $setGroupColor, use the same color here
    - **color**: If no specific color is determined, leave this parameter empty
    
    **Examples**:

    *Basic alt block with conditions without setting color:*
    ```
    alt 
        $condition(UserService, user is authenticated)
            $message(UserService, Database, "user is authenticated")
    else
        $condition(UserService, user not authenticated)
            $message(UserService, AuthService, "user not authenticated")
    end
    ```
    
    *Loop with color matching $setGroupColor:*
    ```
    $setGroupColor(NOKIA_GREEN)
    loop
        $condition(ProcessManager, while items remain, NOKIA_GREEN)
            $message(ProcessManager,  process next item, NOKIA_GREEN)
    end
    $revertGroupColor()
    ```
