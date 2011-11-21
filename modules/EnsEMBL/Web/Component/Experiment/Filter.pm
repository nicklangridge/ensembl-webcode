package EnsEMBL::Web::Component::Experiment::Filter;

use strict;

use base qw(EnsEMBL::Web::Component::Experiment);

sub caption       { 'Experiment Summary' }
sub short_caption { 'Experiment Summary' }

sub content {
  my $self    = shift;
  my $object  = $self->object;
  my $hub     = $self->hub;

  my $grouped_feature_sets = $object->get_grouped_feature_sets;
#   my $total_feature_sets   = scalar @{$object->get_feature_sets_info};
  my $applied_filters      = $object->applied_filters;

  my $table   = $self->new_table(
    [
      { 'key' => 'count',         'title' => 'Number of experiments', 'align' => 'right', 'width' => '150px', 'sort' => 'numeric' },
      { 'key' => 'show',          'title' => '', 'sort' => 'none', 'align' => 'center' },
      (
        $object->is_single_feature_view ? () : (
#           { 'key' => 'count_filter',  'title' => 'Displayed',  'align' => 'right', 'width' => '150px', 'sort' => 'numeric_hidden' },
          { 'key' => 'add_filter',    'title' => '', 'sort' => 'none', 'align' => 'center' }
        )
      ),
      { 'key' => 'filter_value',  'title' => ''             },
      { 'key' => 'filter_type',   'title' => 'Filter type'  },
      { 'key' => 'desc',          'title' => 'Description'  },
    ],
    [],
    {'data_table' => 1, 'class' => 'no_col_toggle', 'exportable' => 0}
  );

  for my $filter_type (sort keys %$grouped_feature_sets) {
    my $filter_values = $grouped_feature_sets->{$filter_type};
    while (my ($filter_value, $grouped_feature_types) = each %$filter_values) {
      my $all_count         = $grouped_feature_types->{'count'};
      my $filtered_count    = $grouped_feature_types->{'filtered'} || '0';
      my $filter_applied    = $object->is_filter_applied($filter_type, $filter_value);

      my $new_filter_label  = $all_count
          ? $filter_applied && scalar keys %$applied_filters == 1
          ? 'Displayed'
          : sprintf('<a href="%s">Show</a>', $hub->url({'ex' => $object->get_url_param({$filter_type, $filter_value})}))
          : '';
      my $add_filter_label  = !$filter_applied 
          ? $filtered_count
          ? sprintf('<a href="%s">Add filter</a> (%s)', $hub->url({'ex' => $object->get_url_param({$filter_type, $filter_value}, 1)}), $filtered_count)
          : ' - '
          : sprintf('<a href="%s">Remove filter</a>', $hub->url({'ex' => $object->get_url_param({$filter_type, $filter_value}, -1)}));

      $table->add_row({
        'count'         => $all_count,
        'show'          => $new_filter_label,
        (
          $object->is_single_feature_view ? () : (
#             'count_filter'  => $filter_value eq 'All' ? '' : qq(<span class="hide">$filtered_count</span>$filtered_count/$total_feature_sets),
            'add_filter'    => $add_filter_label
          )
        ),
        'filter_value'  => $filter_value,
        'filter_type'   => $filter_type,
        'desc'          => $grouped_feature_types->{'description'}
      });
    }
  }

  return '<p class="space-below">A summary of experimental meta data for sources used in the Ensembl regulation views.</p>'.$table->render;
}

1;