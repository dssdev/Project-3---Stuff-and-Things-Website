/**
All dialogs belong here.
**/

var unauthorizedDialog = function(message){
    $('#dialog-unauthorized').html(message);
    $('#dialog-unauthorized').dialog({
        resizeable: false,
        height: 150,
        width: 300,
        modal: true,
        buttons: {
            "Dismiss": function(){
                $( this ).dialog( "close" );
            }
        }
    });
};

/*
Dialog displayed for adding a new thing.
Note: There ought to be a UI indicator of some flavor after hitting "Submit"
      to indicate it's processing before the page is reloaded. I'm not handling
      edge cases at this time.
*/
var addDialog = function(stuffList){
    //$('#dialog-add').show();
    $('#thingForm').trigger("reset");
    $('#thingForm').clearForm();
    $('#addImagePreview').removeClass('img-preview');

    populateSelector(stuffList);
    $('#dialog-add').dialog({
        resizeable: false,
        close: function(){$('#addImagePreview').attr('src','');},
        height:400,
        width:800,
        modal: true,
        title: "Add New Thing",
        buttons: {"Add": function(){
                $('#thingForm').submit();
                $( this ).dialog( "close" );
                    },
                "Cancel": function(){
                    $( this ).dialog( "close" );
                }
        }
    });
};


var deleteDialog = function(id){
    console.log("del id: " + id);
    var stoken;
    $('#dialog-delete').html("You're about to send this thing to the bit bucket in the sky. Are you sure?");
    $('#dialog-delete').dialog({
          open: function(event, ui) {
                $(".ui-dialog-titlebar-close").hide();
                //Get static token for del POST
                $.getJSON('/gettoken', function(response){
                    stoken = response.Token[1];
                });
            },
          resizable: false,
          height:200,
          width:250,
          modal: true,
          title: "Delete Thing?",
          buttons: {
            "Delete": function() {
              $( this ).dialog( "close" );
              deleteThing(id, stoken);
            },
            "Cancel": function() {
              $( this ).dialog( "close" );
            }
          }
    });
};

/*
Use the same form as adding things to update. Populate based on current thing.
Note: This should have handling to disable the update button with the image loads
      but I'm tired of handling edge cases for this nonsensical website.
*/
var editDialog = function(thing, stuffList){
    $('#thingForm').trigger("reset");

    $('#addThing').hide();
    //$('#dialog-update').show();
    $('#thingForm').find("input[name='name']").attr('value', thing.name);
    $('#thingForm').find("input[name='description']").attr('value', thing.description);
    $('#thingForm').find("input[name='quantity']").attr('value', thing.quantity);

    $('#addImagePreview').attr('src','');
    $('#addImagePreview').removeAttr('style');
    $('#addImagePreview').attr('src',thing.image);

    $('#addImagePreview').on('load', function(){
        var newSize = resizeImage(55,55,$('#addImagePreview').height(),$('#addImagePreview').width());
        $('#addImagePreview').height(newSize.height);
        $('#addImagePreview').width(newSize.width);
        $('#addImagePreview').addClass('img-preview');
    });

    populateSelector(stuffList, thing);

    $('#dialog-add').dialog({
      //open: function(event, ui) { $(".ui-dialog-titlebar-close").hide(); },
      title: "Edit Thing",
      height: 400,
      width: 800,
      modal: true,
      close: function(){
        $('#addThing').show();
        $('#addImagePreview').attr('src','');
        $('#addImagePreview').removeAttr('style');
      },
      buttons: {
        "Update": function(){
          $(this).dialog("close");
          updateThing(thing);
        },
        "Cancel": function() {
          $(this).dialog( "close" );
        }
      }
    });
};


function populateSelector(stuffList, thing){
    $('#stuffSelector').html('');
    $.each(stuffList, function(key, value){
        if (thing != undefined && thing.stuff_id == value.id){
            $('#stuffSelector').append("<option value='" + value.id + "' selected='selected'>" + value.name + "</option>");
        }else{
            $('#stuffSelector').append("<option value='" + value.id + "'>" + value.name + "</option>");
        }

    });
}